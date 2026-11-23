// Validação dos dados de conta recebidos do cliente, que não são confiáveis por defeito.
// Convenção: cada validador devolve uma mensagem de erro ou null se o campo for válido.
// unknown exige verificar o tipo antes de usar métodos como trim().
export function validarNome(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O nome deve ser em texto.";
  }

  // Ignora os espaços no início/fim ao verificar o comprimento e o conteúdo do nome.
  const nome = value.trim();

  if (nome.length < 3) {
    return "O nome deve ter pelo menos 3 caracteres.";
  }

  if (nome.length > 50) {
    return "O nome não pode ter mais de 50 caracteres.";
  }

  // Expressão regular: aceita caracteres dos intervalos indicados e espaços em branco.
  // À-ÿ é um intervalo de caracteres, não uma validação completa de todos os nomes possíveis.
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) {
    return "O nome só pode conter letras e espaços.";
  }

  return null;
}

// Verifica um formato básico; não confirma que a caixa de email exista.
export function validarEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O email deve ser em texto.";
  }

  const email = value.trim();

  if (email.length < 5) {
    return "O email deve ter pelo menos 5 caracteres.";
  }

  // Exige texto sem espaços/@, um @, um domínio e um ponto antes da parte final.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "O email é inválido.";
  }

  return null;
}

// A password mantém os caracteres originais: não usamos trim para a transformar.
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

  // Cada (?=...) exige pelo menos uma minúscula, maiúscula, número e símbolo permitido.
  // A classe final só permite letras ASCII, algarismos e os símbolos listados, sem espaços.
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(senha)) {
    return "A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial (@$!%*?&).";
  }

  return null;
}

// Telefone é string para preservar o + e eventuais zeros iniciais.
export function validarTelefone(value: unknown): string | null {
  if (typeof value !== "string") {
    return "O telefone deve ser em texto.";
  }

  const telefone = value.trim();

  // Aceita + opcional, seguido de 9 a 15 algarismos; rejeita espaços e hífenes.
  if (!/^\+?\d{9,15}$/.test(telefone)) {
    return "O telefone é inválido. Deve conter apenas números e pode começar com '+'.";
  }

  return null;
}

// Guarda de tipo: se devolver true, o TypeScript permite aceder a propriedades por nome.
// Exclui null e arrays, que também têm typeof "object" em JavaScript.
function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// No registo, todos os quatro campos são obrigatórios.
// Devolve todos os problemas de uma vez; [] significa que os dados passaram nas verificações.
export function validarRegisto(body: unknown): string[] {
  if (!ehObjeto(body)) {
    return ["Corpo do pedido inválido."];
  }

  const erros: string[] = [];

  // Cada erro encontrado é acrescentado ao array; null não é acrescentado.
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

// Na atualização só validamos os campos presentes, mas exigimos pelo menos um reconhecido.
export function validarAtualizacao(body: unknown): string[] {
  if (!ehObjeto(body)) {
    return ["Corpo do pedido inválido."];
  }

  const erros: string[] = [];
  // let permite alterar a variável quando encontramos um campo atualizável.
  let temAlgumCampo = false;

  // undefined significa ausente; um valor null foi enviado e será rejeitado pelo validador.
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

  // Impede aceitar um objeto vazio ou composto apenas por campos desconhecidos.
  if (!temAlgumCampo) {
    return ["Deve enviar pelo menos um campo para atualizar (nome, email, password ou telefone)."];
  }

  return erros;
}
