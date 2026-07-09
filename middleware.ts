import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jurnal/:path*",
    "/buku-besar/:path*",
    "/laporan/:path*",
    "/akun/:path*",
    "/pengaturan/:path*",
  ],
};
