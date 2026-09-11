"use client";

import { useMemo, useState } from "react";
import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { PAISES, PAIS_PADRAO } from "@/lib/paises";

/**
 * Telefone com seletor de país (Brasil + UE principais). Formata enquanto
 * digita e valida por DDI (libphonenumber-js). O campo é opcional — número
 * incompleto só mostra um aviso, não bloqueia o envio.
 *
 * Envia dois campos ocultos: `telefone` (E.164, ex. "+351912345678") e `ddi`
 * (só os dígitos, ex. "351") — o `ddi` vai pro `tenant_settings.ddi` (usado
 * hoje nos links de WhatsApp), preenchido pelo país escolhido aqui.
 */
export function PhoneCountryField({
  telefoneName = "telefone",
  ddiName = "ddi",
  defaultCountry = PAIS_PADRAO,
}: {
  telefoneName?: string;
  ddiName?: string;
  defaultCountry?: string;
}) {
  const [pais, setPais] = useState<CountryCode>(defaultCountry as CountryCode);
  const [digitado, setDigitado] = useState("");

  const formatado = useMemo(() => new AsYouType(pais).input(digitado), [pais, digitado]);
  const e164 = useMemo(() => {
    if (!digitado.trim()) return "";
    const pn = parsePhoneNumberFromString(digitado, pais);
    return pn?.number ?? "";
  }, [digitado, pais]);
  const valido = digitado.trim() === "" || isValidPhoneNumber(digitado, pais);
  const ddi = getCountryCallingCode(pais);

  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-text-faint">
        Telefone (opcional)
      </span>
      <div className="flex gap-2">
        <select
          value={pais}
          onChange={(e) => setPais(e.target.value as CountryCode)}
          aria-label="País"
          className="w-[112px] shrink-0 rounded-xl border border-ink-line bg-ink-soft px-2 py-2.5 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
        >
          {PAISES.map((p) => (
            <option key={p.iso2} value={p.iso2}>
              {p.bandeira} +{getCountryCallingCode(p.iso2 as CountryCode)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={formatado}
          onChange={(e) => setDigitado(e.target.value)}
          placeholder="Número"
          className="flex-1 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-text-faint focus:border-gold focus:ring-2 focus:ring-gold/25"
        />
      </div>
      {!valido && (
        <span className="mt-1.5 block text-xs text-garnet">
          Esse número parece incompleto para {PAISES.find((p) => p.iso2 === pais)?.nome}.
        </span>
      )}
      <input type="hidden" name={telefoneName} value={e164} />
      <input type="hidden" name={ddiName} value={ddi} />
    </div>
  );
}
