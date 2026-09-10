import {
  PERMISSOES_EXTRAS,
  SECAO_LABEL,
  SECOES_LIBERAVEIS,
} from "@/lib/permissions";

/** Grupo de checkboxes de permissão (seções + extras), `name="permissoes"`. */
export function PermissionsCheckboxes({
  selecionadas,
}: {
  selecionadas: string[];
}) {
  const marcada = (chave: string) => selecionadas.includes(chave);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 text-[11.5px] font-semibold tracking-wide text-text-faint uppercase">
          Seções
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {SECOES_LIBERAVEIS.map((secao) => (
            <label
              key={secao}
              className="flex items-center gap-2 text-[13px] text-text"
            >
              <input
                type="checkbox"
                name="permissoes"
                value={secao}
                defaultChecked={marcada(secao)}
                className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
              />
              {SECAO_LABEL[secao]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11.5px] font-semibold tracking-wide text-text-faint uppercase">
          Agenda
        </div>
        <p className="mb-1.5 text-[11.5px] text-text-faint">
          A própria agenda está sempre incluída.
        </p>
        {PERMISSOES_EXTRAS.map((extra) => (
          <label
            key={extra}
            className="flex items-center gap-2 text-[13px] text-text"
          >
            <input
              type="checkbox"
              name="permissoes"
              value={extra}
              defaultChecked={marcada(extra)}
              className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
            />
            {SECAO_LABEL[extra]}
          </label>
        ))}
      </div>
    </div>
  );
}
