declare module "node:crypto" {
  type Hash = {
    update(data: string, inputEncoding: "utf8"): Hash;
    digest(encoding: "hex"): string;
  };

  export const createHash: (algorithm: "sha256") => Hash;
}
