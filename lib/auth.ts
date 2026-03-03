import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Keycloak',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        try {
          const issuer = process.env.KEYCLOAK_ISSUER;
          const clientId = process.env.KEYCLOAK_CLIENT_ID;
          const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

          if (!issuer || !clientId) {
            console.error("Keycloak configuration missing");
            return null;
          }

          const params = new URLSearchParams({
            client_id: clientId,
            grant_type: 'password',
            username: credentials.username,
            password: credentials.password,
          });

          if (clientSecret) {
            params.append('client_secret', clientSecret);
          }

          const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
          });

          const data = await res.json();

          if (res.ok && data.access_token) {
            const userRes = await fetch(`${issuer}/protocol/openid-connect/userinfo`, {
              headers: { Authorization: `Bearer ${data.access_token}` }
            });
            
            if (userRes.ok) {
              const userData = await userRes.json();
              return {
                id: userData.sub,
                name: userData.preferred_username || userData.name || credentials.username,
                email: userData.email,
                accessToken: data.access_token
              };
            }
          }
          console.error("Keycloak auth failed:", data);
          return null;
        } catch (error) {
          console.error("Keycloak API error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
