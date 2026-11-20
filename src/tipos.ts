export type Estado = "rascunho" | "publicado";

export interface Jornalista {
  id: number;
  nome: string;
  email: string;
  password: string;
  telefone: string;
}

export interface Artigo {
  id: number;
  titulo: string;
  texto: string;
  estado: Estado;
  jornalistaId: number;
}

export interface Fonte {
  id: number;
  url: string;
  artigoId: number;
  arquivada: boolean;
  linkArquivo: string | null;
  dataArquivo: string | null;
}