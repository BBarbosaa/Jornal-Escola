export function validarNome(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O nome deve ser em texto.";
  }

  const nome = value.trim();

  if (nome.length < 3) {
    return "O nome deve ter pelo menos 3 caracteres.";
  }

  if (nome.length > 50) {
    return "O nome não pode ter mais de 50 caracteres.";
  }

  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) {
    return "O nome só pode conter letras e espaços.";
  }

  return null;
}

export function validarEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O email deve ser em texto.";
  }

  const email = value.trim();

  if (email.length < 5) {
    return "O email deve ter pelo menos 5 caracteres.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "O email é inválido.";
  }

  return null;
}

export function validarSenha(value: unknown): string | null {
  if (typeof value !== "string") {
    return "A senha deve ser em texto.";
  }

  const senha = value;

  if (senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (senha.length > 100) {
    return "A senha não pode ter mais de 100 caracteres.";
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(senha)) {
    return "A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial (@$!%*?&).";
  }

  return null;
}

export function validarTelefone(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O telefone deve ser em texto.";
  }

  const telefone = value.trim();

  if (!/^\+?\d{9,15}$/.test(telefone)) {
    return "O telefone é inválido. Deve conter apenas números e pode começar com '+'.";
  }

  return null;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function validarRegisto(body: unknown): string[] {
  if (!ehObjeto(body)) {
    return ["Corpo do pedido inválido."];
  }

  const erros: string[] = [];

  const erroNome = validarNome(body.nome);
  if (erroNome) erros.push(erroNome);

  const erroEmail = validarEmail(body.email);
  if (erroEmail) erros.push(erroEmail);

  const erroPassword = validarSenha(body.password);
  if (erroPassword) erros.push(erroPassword);

  const erroTelefone = validarTelefone(body.telefone);
  if (erroTelefone) erros.push(erroTelefone);

  return erros;
}

export function validarAtualizacao(body: unknown): string[] {
  if (!ehObjeto(body)) {
    return ["Corpo do pedido inválido."];
  }

  const erros: string[] = [];
  let temAlgumCampo = false;

  if (body.nome !== undefined) {
    temAlgumCampo = true;
    const erro = validarNome(body.nome);
    if (erro) erros.push(erro);
  }

  if (body.email !== undefined) {
    temAlgumCampo = true;
    const erro = validarEmail(body.email);
    if (erro) erros.push(erro);
  }

  if (body.password !== undefined) {
    temAlgumCampo = true;
    const erro = validarSenha(body.password);
    if (erro) erros.push(erro);
  }

  if (body.telefone !== undefined) {
    temAlgumCampo = true;
    const erro = validarTelefone(body.telefone);
    if (erro) erros.push(erro);
  }

  if (!temAlgumCampo) {
    return ["Deve enviar pelo menos um campo para atualizar (nome, email, password ou telefone)."];
  }

  return erros;
}
