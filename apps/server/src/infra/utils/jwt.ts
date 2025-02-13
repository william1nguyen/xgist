import jwt from 'jsonwebtoken';
import {JwksClient, type SigningKey} from 'jwks-rsa';
import {
  ExpiredTokenError,
  InvalidAuthTokenError,
} from '~/domain/user/user.errors';
import {env} from '~/env';
import logger from '../logger';
;

const jwksUri = env.JWKS_URI;
const jwksClient = new JwksClient({jwksUri});

const getJwksClient = (isAdmin: boolean) => {
  return jwksClient;
};

const getSigningKey = async (
  client: JwksClient,
  kid: string
): Promise<SigningKey> => {
  return new Promise<SigningKey>((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        reject(err);
      } else {
        resolve(key);
      }
    });
  });
};

export const verifyJwt = async (
  accessToken: string,
  useAdminAuth?: boolean
) => {
  const jwksC = getJwksClient(Boolean(useAdminAuth));
  const jwtPayload = jwt.decode(accessToken, {complete: true, json: true});

  if (!jwtPayload?.header?.kid) {
    throw new InvalidAuthTokenError();
  }

  const key = await getSigningKey(jwksC, jwtPayload.header.kid);
  const signingKey = key.getPublicKey();

  try {
    return jwt.verify(accessToken, signingKey);
  } catch (err) {
    logger.error({err, msg: 'Lỗi xác thực token'});
    throw new ExpiredTokenError();
  }
};

export const decodeToken = (token: string) => {
  return jwt.decode(token, {complete: true, json: true});
};

export const extractPayloadNoVerify = (jwtToken: string) => {
  const payload = jwt.decode(jwtToken);
  if (
    typeof payload === 'string' ||
    !payload?.sub ||
    !payload?.jti ||
    !payload?.sid ||
    !payload?.exp
  ) {
    throw new InvalidAuthTokenError();
  }

  return {
    sub: payload.sub,
    exp: payload.exp ?? 0,
    jti: payload.jti,
    sid: payload.sid,
  };
};

export const extractPayload = async (
  accessToken: string,
) => {
  const payload = await verifyJwt(accessToken);

  if (
    typeof payload === 'string' ||
    !payload.sub ||
    !payload.jti ||
    !payload.sid ||
    !payload.exp
  ) {
    throw new InvalidAuthTokenError();
  }

  const expiredTimeInSeconds = payload.exp;
  const sub = payload.sub;
  const jti = payload.jti;
  const sid = payload.sid;
  const roles = payload.realm_access?.roles ?? [];

  return {sub, exp: expiredTimeInSeconds, jti, sid, roles};
};