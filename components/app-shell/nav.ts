import {
  Calendar,
  Users,
  UserCog,
  Scissors,
  Package,
  Wallet,
  Truck,
  Gift,
  HeartHandshake,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { TenantSettingsRow } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Chave da seção, usada para checar permissão de funcionário. */
  section: string;
  /** Só o dono enxerga. */
  ownerOnly?: boolean;
  /** Só um funcionário com profissional vinculado enxerga (nunca o dono). */
  professionalOnly?: boolean;
  /** Flag do `tenant_settings` que precisa estar ligada para a seção aparecer. */
  flag?: keyof TenantSettingsRow;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/agenda", label: "Agenda", icon: Calendar, section: "agenda" },
  {
    href: "/meu-desempenho",
    label: "Meu desempenho",
    icon: TrendingUp,
    section: "meu-desempenho",
    professionalOnly: true,
  },
  { href: "/clientes", label: "Clientes", icon: Users, section: "clientes" },
  { href: "/crm", label: "CRM", icon: HeartHandshake, section: "crm" },
  { href: "/equipe", label: "Equipe", icon: UserCog, section: "equipe", ownerOnly: true },
  { href: "/servicos", label: "Serviços", icon: Scissors, section: "servicos" },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Package,
    section: "produtos",
    flag: "habilitar_estoque",
  },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, section: "financeiro" },
  {
    href: "/fornecedores",
    label: "Fornecedores",
    icon: Truck,
    section: "fornecedores",
    flag: "habilitar_fornecedores",
  },
  { href: "/aniversarios", label: "Aniversários", icon: Gift, section: "aniversarios" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, section: "configuracoes", ownerOnly: true },
];
