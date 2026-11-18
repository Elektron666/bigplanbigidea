"use client";

import { useActionState } from "react";
import { shopPasswordAction } from "../../actions";
import { buttonClass, Field, inputClass } from "@/components/panel/ui";

export function ShopPasswordForm() {
  const [state, action, pending] = useActionState(shopPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Şu anki şifre">
        <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Field label="Yeni şifre" hint="En az 10 karakter.">
        <input name="next" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
      </Field>
      <Field label="Yeni şifre (tekrar)">
        <input name="again" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
      </Field>
      {state?.error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-[13px] text-[#35523a]">
          Şifreniz değişti.
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        Şifreyi değiştir
      </button>
    </form>
  );
}
