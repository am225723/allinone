import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { supabaseServer } from './supabase';

const RP_NAME = 'Command Center';

function uint8ArrayToBase64url(arr: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...arr));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getRpId(): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  return 'localhost';
}

function getOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const rpId = getRpId();
  return rpId === 'localhost' ? 'http://localhost:5000' : `https://${rpId}`;
}

const RP_ID = getRpId();
const ORIGIN = getOrigin();

interface StoredCredential {
  id: number;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string | null;
  transports: string[] | null;
}

export async function getRegistrationOptions(userId: string, userName: string) {
  const { data: existingCredentials } = await supabaseServer
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', userId);

  const excludeCredentials = (existingCredentials || []).map((cred) => ({
    id: cred.credential_id,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: userName || userId,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  return options;
}

export async function verifyAndSaveRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;

  const { error } = await supabaseServer
    .from('webauthn_credentials')
    .insert({
      user_id: userId,
      credential_id: typeof credential.id === 'string' ? credential.id : uint8ArrayToBase64url(credential.id),
      public_key: typeof credential.publicKey === 'string' ? credential.publicKey : uint8ArrayToBase64url(credential.publicKey),
      counter: credential.counter,
      device_name: deviceName || credentialDeviceType || 'Unknown Device',
      transports: response.response.transports || [],
    });

  if (error) {
    throw new Error(`Failed to save credential: ${error.message}`);
  }

  return verification;
}

export async function getAuthenticationOptions(userId?: string) {
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

  if (userId) {
    const { data: credentials } = await supabaseServer
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', userId);

    allowCredentials = (credentials || []).map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const credentialId = response.id;

  const { data: credential, error } = await supabaseServer
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', credentialId)
    .single();

  if (error || !credential) {
    throw new Error('Credential not found');
  }

  const storedCred = credential as StoredCredential;

  const publicKeyBuffer = Uint8Array.from(Buffer.from(storedCred.public_key, 'base64url'));
  
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: storedCred.credential_id,
      publicKey: publicKeyBuffer,
      counter: storedCred.counter,
      transports: storedCred.transports as AuthenticatorTransportFuture[] | undefined,
    },
  });

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  await supabaseServer
    .from('webauthn_credentials')
    .update({
      counter: verification.authenticationInfo.newCounter,
    })
    .eq('credential_id', credentialId);

  return { verified: true, userId: storedCred.user_id };
}

export async function getUserCredentials(userId: string) {
  const { data, error } = await supabaseServer
    .from('webauthn_credentials')
    .select('id, device_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  return data || [];
}

export async function deleteCredential(userId: string, credentialId: number) {
  const { error } = await supabaseServer
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete credential: ${error.message}`);
  }

  return true;
}

export async function hasRegisteredCredentials(userId: string): Promise<boolean> {
  const { count, error } = await supabaseServer
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return false;
  return (count || 0) > 0;
}

export async function storeChallenge(
  sessionId: string,
  challenge: string,
  type: 'registration' | 'authentication',
  userId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  await supabaseServer
    .from('webauthn_challenges')
    .delete()
    .lt('expires_at', new Date().toISOString());

  const { error } = await supabaseServer
    .from('webauthn_challenges')
    .upsert({
      id: sessionId,
      user_id: userId || null,
      challenge,
      type,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    throw new Error(`Failed to store challenge: ${error.message}`);
  }
}

export async function getAndDeleteChallenge(
  sessionId: string,
  expectedType: 'registration' | 'authentication'
): Promise<{ challenge: string; userId: string | null } | null> {
  const { data, error } = await supabaseServer
    .from('webauthn_challenges')
    .select('challenge, user_id, expires_at, type')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  await supabaseServer
    .from('webauthn_challenges')
    .delete()
    .eq('id', sessionId);

  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  if (data.type !== expectedType) {
    return null;
  }

  return { challenge: data.challenge, userId: data.user_id };
}

export async function hasAnyRegisteredCredentials(): Promise<boolean> {
  const { count, error } = await supabaseServer
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true });

  if (error) return false;
  return (count || 0) > 0;
}
