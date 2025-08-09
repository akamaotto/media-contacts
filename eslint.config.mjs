import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prevent direct PrismaClient instantiation to enforce singleton pattern
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              importNames: ["PrismaClient"],
              message: "Use singleton from '@/lib/prisma' instead of direct PrismaClient instantiation to prevent connection pool exhaustion"
            }
          ]
        }
      ],
      // Prevent new PrismaClient() instantiation
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='PrismaClient']",
          message: "Direct PrismaClient instantiation is not allowed. Use the singleton from '@/lib/prisma' to prevent connection pool exhaustion."
        }
      ]
    }
  },
  {
    // Exception for the singleton file itself
    files: ["src/lib/prisma.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off"
    }
  }
];

export default eslintConfig;
