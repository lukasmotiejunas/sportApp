import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Placeholder Lithuanian Privacy Policy — GDPR-shaped template that satisfies
// Stripe's account activation requirement. Iterate before real launch.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Atgal
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
          </Link>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime-300">
            Teisiniai
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Privatumo politika
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Paskutinį kartą atnaujinta: 2026 m. liepos 27 d.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-white/80">
          <Section title="1. Duomenų valdytojas">
            <p>
              Lumo (toliau — „Paslauga") tvarko asmens duomenis kaip duomenų
              valdytojas savo klientų (klubų administratorių) atžvilgiu ir kaip
              duomenų tvarkytojas — klubo narių ir trenerių atžvilgiu, kuriuos
              į sistemą įrašo klubo administratorius. Kontaktai:{" "}
              <a
                href="mailto:hello@lumo.lt"
                className="text-lime-300 hover:underline"
              >
                hello@lumo.lt
              </a>
              .
            </p>
          </Section>

          <Section title="2. Kokius duomenis renkame">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Klubo administratoriai:</strong> vardas, pavardė, el.
                pašto adresas, klubo pavadinimas, slaptažodžio kriptografinis
                fragmentas (hash).
              </li>
              <li>
                <strong>Mokėjimų duomenys:</strong> kortelės numerį tvarko tik
                Stripe (PCI DSS Level 1 sertifikuotas mokėjimų paslaugų
                teikėjas). Mes saugome tik mokėjimo metaduomenis — kortelės
                paskutinius keturis skaitmenis, tipą (Visa/Mastercard),
                galiojimo mėnesį/metus, sąskaitų istoriją.
              </li>
              <li>
                <strong>Klubo nariai ir treneriai (jei įrašote):</strong>{" "}
                vardas, pavardė, el. paštas, telefonas, gimimo data, treniruočių
                dalyvavimas, individualūs planai, rezultatai — įrašote patys,
                turėdami teisinį pagrindą (sutartis su nariu / trenerio
                sutikimas).
              </li>
              <li>
                <strong>Techniniai duomenys:</strong> IP adresas, naršyklės
                tipas, prieigos laikas — naudojami saugumui ir klaidų
                stebėjimui.
              </li>
            </ul>
          </Section>

          <Section title="3. Kodėl tvarkome duomenis (teisiniai pagrindai)">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Sutarties vykdymas</strong> — Paslaugos teikimas jums
                pagal prenumeratos sutartį.
              </li>
              <li>
                <strong>Teisinės prievolės</strong> — mokestinės pareigos,
                buhalterinė apskaita.
              </li>
              <li>
                <strong>Teisėti interesai</strong> — Paslaugos saugumas,
                sukčiavimo prevencija, klaidų taisymas.
              </li>
              <li>
                <strong>Sutikimas</strong> — bet kokia neprivaloma komunikacija
                (naujienlaiškiai), jei įsijungiate.
              </li>
            </ul>
          </Section>

          <Section title="4. Kam perduodame duomenis (subtvarkytojai)">
            <p className="mb-2">
              Naudojame šiuos technologijų paslaugų teikėjus, kurie veikia
              pagal ES BDAR reikalavimus:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Stripe Payments Europe, Ltd.</strong> (Airija) —
                mokėjimų apdorojimas.
              </li>
              <li>
                <strong>Neon, Inc.</strong> (Serveriai ES — Frankfurte) —
                duomenų bazės talpinimas.
              </li>
              <li>
                <strong>Vercel Inc.</strong> — programos talpinimas ir
                pristatymas.
              </li>
            </ul>
            <p className="mt-3">
              Duomenų trečiosioms šalims (ne subtvarkytojams) neperduodame,
              išskyrus atvejus, kai to reikalauja įstatymai.
            </p>
          </Section>

          <Section title="5. Kiek laiko saugome duomenis">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Klubo duomenys (nariai, treniruotės, planai) saugomi tol, kol
                yra aktyvi prenumerata.
              </li>
              <li>
                Ištrynus klubą, visi susiję duomenys pašalinami per 30 dienų
                (išskyrus mokėjimų metaduomenis, kuriuos privalome saugoti
                mokesčių tikslais 10 metų).
              </li>
              <li>
                Mokėjimų metaduomenys (sąskaitos, PVM įrašai) saugomi 10 metų
                pagal LR mokesčių administravimo įstatymą.
              </li>
            </ul>
          </Section>

          <Section title="6. Jūsų teisės pagal BDAR">
            <p className="mb-2">Turite šias teises:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Susipažinti su savo asmens duomenimis ir gauti jų kopiją.
              </li>
              <li>Ištaisyti neteisingus ar nepilnus duomenis.</li>
              <li>
                Reikalauti duomenų ištrynimo („teisė būti pamirštam") — su
                sąlyga, kad neprieštarauja teisinėms prievolėms.
              </li>
              <li>Apriboti duomenų tvarkymą arba prieštarauti jam.</li>
              <li>Perkelti savo duomenis kitam paslaugų teikėjui.</li>
              <li>Bet kada atšaukti savo sutikimą.</li>
              <li>
                Pateikti skundą Valstybinei duomenų apsaugos inspekcijai (
                <a
                  href="https://vdai.lrv.lt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-300 hover:underline"
                >
                  vdai.lrv.lt
                </a>
                ).
              </li>
            </ul>
            <p className="mt-3">
              Teisėms įgyvendinti rašykite{" "}
              <a
                href="mailto:hello@lumo.lt"
                className="text-lime-300 hover:underline"
              >
                hello@lumo.lt
              </a>
              . Atsakysime per 30 dienų.
            </p>
          </Section>

          <Section title="7. Slapukai">
            <p>
              Naudojame tik būtinuosius slapukus (sesijos identifikatorius
              prisijungimui). Nenaudojame analitinių ar reklaminių slapukų,
              todėl atskiro sutikimo neprašome.
            </p>
          </Section>

          <Section title="8. Saugumas">
            <p>
              Duomenys perduodami užšifruotu HTTPS ryšiu. Slaptažodžiai saugomi
              tik kaip kriptografiniai fragmentai (bcrypt). Mokėjimų duomenys
              niekada nesiekia mūsų serverių — juos tvarko Stripe.
            </p>
          </Section>

          <Section title="9. Politikos keitimai">
            <p>
              Apie reikšmingus šios politikos pakeitimus informuosime el. paštu
              ir šioje puslapio viršuje esančia data.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          Taip pat žr.{" "}
          <Link to="/terms" className="text-lime-300 hover:underline">
            Paslaugų teikimo sąlygos
          </Link>
          .
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
