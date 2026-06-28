import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import { toast } from "sonner";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ name, email, password }) => {
    setIsLoading(true);
    try {
      await registerUser({ name, email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "#0A0908" }}
    >
      {/* Ambient glow — gold/peach instead of indigo */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: "rgba(212,168,86,0.08)" }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #D4A856, #E8B894)",
              boxShadow: "0 8px 24px rgba(212,168,86,0.25)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" style={{ color: "#0A0908" }}>
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold" style={{ color: "#F0E6D2" }}>
              StudyMind AI
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(180,195,230,0.45)" }}>
              Create your account
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Abhik Kundu"
              icon={User}
              error={errors.name?.message}
              autoComplete="name"
              {...register("name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={Mail}
              error={errors.email?.message}
              autoComplete="email"
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="min. 8 chars, one number"
              icon={Lock}
              error={errors.password?.message}
              autoComplete="new-password"
              {...register("password")}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              {...register("confirmPassword")}
            />

            <Button type="submit" className="mt-2 w-full" size="lg" isLoading={isLoading}>
              Create account
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm" style={{ color: "rgba(180,195,230,0.4)" }}>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium transition-colors"
            style={{ color: "#D4A856" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E8B894")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#D4A856")}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}