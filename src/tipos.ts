// Estes tipos descrevem os dados para o TypeScript verificar o código.
// Não validam os pedidos em execução: essa tarefa pertence aos validadores de utils/.
// A união de literais permite apenas estes dois valores para o estado.
export type Estado = "rascunho" | "publicado";

// Modelo guardado em jornalistas.json. interface descreve os campos de um objeto.
export interface Jornalista {
  id: number;
  nome: string;
  email: string;
  // Guarda o hash bcrypt, nunca a password original.
  password: string;
  // Guarda o telefone encriptado; a API desencripta-o ao devolver o perfil.
  telefone: string;
}

// Modelo guardado em artigos.json. Cada artigo pertence a um jornalista.
export interface Artigo {
  id: number;
  titulo: string;
  texto: string;
  estado: Estado;
  // Referência ao id do autor em jornalistas.json.
  jornalistaId: number;
}

// Modelo guardado em fontes.json, com metadados obtidos no Arquivo.pt.
export interface Fonte {
  id: number;
  url: string;
  // Referência ao id do artigo que utiliza esta fonte.
  artigoId: number;
  arquivada: boolean;
  // null representa a ausência de ligação/data de arquivo.
  linkArquivo: string | null;
  dataArquivo: string | null;
}
