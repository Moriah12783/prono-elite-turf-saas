import { NextRequest, NextResponse } from "next/server";

import {
  buildEliteTurfSuccessResponse,
  validateEliteTurfApiPublicationPayload
} from "@/services/publication/elite-turf-contract";

type TestMode = "success" | "business_error" | "validation_error" | "technical_error";

function getTestMode(request: NextRequest): TestMode {
  const mode = request.nextUrl.searchParams.get("mode");

  if (
    mode === "success" ||
    mode === "business_error" ||
    mode === "validation_error" ||
    mode === "technical_error"
  ) {
    return mode;
  }

  return "success";
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ") || authHeader.slice("Bearer ".length).trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: "Jeton Bearer manquant ou invalide.",
        receivedAt: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  const mode = getTestMode(request);

  if (mode === "technical_error") {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: "Erreur technique simulee cote API Elite Turf.",
        receivedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: "Le corps JSON est invalide.",
        receivedAt: new Date().toISOString()
      },
      { status: 400 }
    );
  }

  const validation = validateEliteTurfApiPublicationPayload(body);

  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: validation.message,
        receivedAt: new Date().toISOString()
      },
      { status: 422 }
    );
  }

  if (mode === "validation_error") {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: "Erreur de validation simulee : le contenu editorial ne respecte pas les contraintes du site cible.",
        receivedAt: new Date().toISOString()
      },
      { status: 422 }
    );
  }

  if (mode === "business_error") {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: "Erreur metier simulee : cette course est deja publiee cote Elite Turf.",
        receivedAt: new Date().toISOString()
      },
      { status: 409 }
    );
  }

  return NextResponse.json(buildEliteTurfSuccessResponse(validation.payload), { status: 201 });
}
