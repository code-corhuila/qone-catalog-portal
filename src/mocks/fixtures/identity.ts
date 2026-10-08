import type { Page } from "../../catalog/model/catalog";
import { paginate } from "./catalog";

// The slice of the identity seed this portal reads: the people an ADMIN can assign to a
// section (ID-05 with role=PROFESSOR). Same ids as qone-front/src/mocks/fixtures/identity.ts,
// so a section's professorId resolves in both places. Shape of `User` in qone-identity-api.yaml.
export interface IdentityUser {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "PROFESSOR" | "ADMIN";
  studentCode: string | null;
  program: string | null;
  semester: number | null;
  createdAt: string;
}

const createdAt = "2026-08-01T12:00:00Z";
const staff = (id: string, email: string, name: string, role: IdentityUser["role"]): IdentityUser => ({ id, email, name, role, studentCode: null, program: null, semester: null, createdAt });

export const identityFixtures = {
  users: [
    staff("22222222-2222-4222-8222-222222222221", "carlos.ramirez@uni.edu.co", "Carlos Ramírez", "PROFESSOR"),
    staff("22222222-2222-4222-8222-222222222222", "ana.torres@uni.edu.co", "Ana Torres", "PROFESSOR"),
    staff("22222222-2222-4222-8222-222222222223", "jorge.medina@uni.edu.co", "Jorge Medina", "PROFESSOR"),
    staff("33333333-3333-4333-8333-333333333331", "admin@uni.edu.co", "Patricia Mora", "ADMIN"),
  ],
  page(role: string | null, page: number, limit: number): Page<IdentityUser> {
    return paginate(identityFixtures.users.filter((u) => (role ? u.role === role : true)), page, limit);
  },
};
