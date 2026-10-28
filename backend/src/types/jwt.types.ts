/** Data we store in / read from a JWT. */
export interface JwtPayload {
  /** User id (JWT "sub" claim). */
  sub: number;
  email: string;
}

/** Short-lived token embedded in a file URL so <img>/<video>/downloads work without headers. */
/** Token embedded in a thumbnail URL. It only works for thumbnails. */
export type ThumbTokenPayload = FileTokenPayload;

export interface FileTokenPayload {
  fileId: number;
  userId: number;
}
