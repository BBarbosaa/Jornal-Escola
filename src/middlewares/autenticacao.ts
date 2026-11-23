// Autenticação: verifica o JWT e coloca a identidade do jornalista no pedido.
// A autorização (poder alterar um artigo específico) é verificada nas rotas.
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Alarga o tipo Request do Express para aceitar o campo que acrescentamos abaixo.
// O ? indica que o campo pode ainda não existir, antes da autenticação.
declare global {
  namespace Express {
    interface Request {
      jornalistaId?: number;
    }
  }
}

// Payload é o conteúdo transportado pelo token. Aqui precisamos do id do jornalista.
interface PayloadJwt {
  id: number;
}

// Espera o cabeçalho Authorization: Bearer <token>.
export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token de autenticação não fornecido." });
    return;
  }

  // Retira os 7 caracteres de "Bearer " e os espaços à volta do token.
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ erro: "Token de autenticação não fornecido." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // next(erro) encaminha o problema para o middleware de erros.
    next(new Error("JWT_SECRET não está definido no .env"));
    return;
  }

  try {
    // verify verifica a assinatura e a validade temporal, incluindo expiração se presente.
    // Só aceita HS256. "as" informa o TypeScript, mas não valida o payload em execução.
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as PayloadJwt;

    // Por isso fazemos também esta verificação real do tipo de id.
    if (typeof decoded.id !== "number") {
      res.status(401).json({ erro: "Token inválido." });
      return;
    }

    // As rotas seguintes usam este id; não precisam de confiar num autor enviado no body.
    // Este middleware não consulta se a conta ainda existe em jornalistas.json.
    req.jornalistaId = decoded.id;
    next();
  } catch {
    // Tokens alterados, malformados ou expirados não dão acesso à rota.
    res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}
