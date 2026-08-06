import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Placeholder Lithuanian Terms of Service. Iterate on the copy before real
// launch — this is a first-pass template meant to satisfy Stripe's activation
// requirement (they crawl the URL and require a public ToS + Privacy policy
// for accounts accepting recurring payments).
export default function Terms() {
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
            Paslaugų teikimo sąlygos
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Paskutinį kartą atnaujinta: 2026 m. liepos 27 d.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-white/80">
          <Section title="1. Paslaugų teikėjas">
            <p>
              Lumo (toliau — „Paslauga") teikia sporto klubų valdymo internetinę
              platformą. Paslaugų teikėjas — fizinis asmuo, vykdantis
              individualią veiklą Lietuvos Respublikoje. Kontaktinis el. paštas:{" "}
              <a
                href="mailto:hello@lumo.lt"
                className="text-lime-300 hover:underline"
              >
                hello@lumo.lt
              </a>
              .
            </p>
          </Section>

          <Section title="2. Paslaugos aprašymas">
            <p>
              Paslauga suteikia sporto klubams įrankius narių, trenerių,
              treniruočių tvarkaraščių, dirbtinio intelekto pagalba generuojamų
              ir individualių treniruočių planų, rezultatų lyderių lentelių,
              automatinio narystės mokesčių surinkimo per Stripe ir klubo
              finansinės apskaitos valdymui. Prieigą prie Paslaugos suteikiame
              internetu (SaaS modelis).
            </p>
          </Section>

          <Section title="3. Prenumerata ir mokėjimai">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Prenumeratos kaina — <strong>100 € per mėnesį</strong> už visą
                klubą (PVM neapmokestinama iki 45 000 € metinių pajamų
                slenksčio).
              </li>
              <li>
                <strong>Pirmas mėnuo (30 dienų) — nemokamai.</strong>{" "}
                Registracijos metu pridedate mokėjimo kortelę, tačiau nemokamu
                laikotarpiu nieko neapmokestiname.
              </li>
              <li>
                Praėjus nemokamam laikotarpiui, pirmasis mokestis nurašomas
                automatiškai, tada kartojasi kiekvieno kito mėnesio tą pačią
                dieną. Mokėjimų apdorojimą vykdo Stripe (Airija).
              </li>
              <li>
                Nepavykus nurašyti mokesčio, klubo paskyra suspenduojama, kol
                sąskaita bus apmokėta.
              </li>
            </ul>
          </Section>

          <Section title="4. Prenumeratos atšaukimas ir pinigų grąžinimas">
            <p>
              Prenumeratą galite atšaukti bet kada iš klubo administratoriaus
              skydelio. Atšaukus prenumeratą, jūs išsaugote prieigą iki jau
              apmokėto laikotarpio pabaigos.
            </p>
            <p className="mt-3">
              <strong>Pinigų grąžinimo politika:</strong> jau apmokėti
              laikotarpiai nėra grąžinami. Prenumeratą galite bet kada
              atšaukti, kad ateityje mokesčiai nebūtų nurašomi.
            </p>
          </Section>

          <Section title="5. Kliento pareigos">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Įsipareigojate teikti tikslią registracijos ir mokėjimo
                informaciją bei laiku ją atnaujinti.
              </li>
              <li>
                Atsakote už savo prisijungimo duomenų (el. paštas, slaptažodis)
                saugumą.
              </li>
              <li>
                Įsipareigojate nesinaudoti Paslauga neteisėtai, nepažeisti
                trečiųjų asmenų teisių ir netrukdyti kitiems naudotojams.
              </li>
              <li>
                Klubo administratorius yra atsakingas už narių ir trenerių
                asmens duomenų, kuriuos jis pateikia į sistemą, teisėtą tvarkymą
                (žr. Privatumo politiką).
              </li>
            </ul>
          </Section>

          <Section title="6. Intelektinė nuosavybė">
            <p>
              Paslaugos programinė įranga, dizainas, prekės ženklai ir
              dokumentacija priklauso Paslaugos teikėjui. Kliento duomenys
              (narių, treniruočių ir kt. įrašai) priklauso klientui, ir jis
              gali juos bet kada eksportuoti ar ištrinti.
            </p>
          </Section>

          <Section title="7. Atsakomybės ribojimas">
            <p>
              Paslauga teikiama „tokia, kokia yra" pagrindu. Neužtikriname
              visiško Paslaugos veikimo be pertrūkių ar be klaidų. Paslaugos
              teikėjo atsakomybė ribojama iki paskutinių 12 mėnesių prenumeratos
              mokesčių sumos.
            </p>
          </Section>

          <Section title="8. Sąlygų keitimas">
            <p>
              Šios sąlygos gali būti keičiamos. Apie reikšmingus pakeitimus
              informuosime el. paštu bent 30 dienų iki jų įsigaliojimo. Jeigu
              nesutinkate su naujomis sąlygomis, prieš joms įsigaliojant galite
              atšaukti prenumeratą.
            </p>
          </Section>

          <Section title="9. Taikoma teisė ir ginčai">
            <p>
              Šioms sąlygoms taikoma Lietuvos Respublikos teisė. Ginčai
              sprendžiami Lietuvos Respublikos teismuose pagal Paslaugos
              teikėjo buveinės vietą.
            </p>
          </Section>

          <Section title="10. Kontaktai">
            <p>
              Klausimai dėl šių sąlygų:{" "}
              <a
                href="mailto:hello@lumo.lt"
                className="text-lime-300 hover:underline"
              >
                hello@lumo.lt
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          Taip pat žr.{" "}
          <Link to="/privacy" className="text-lime-300 hover:underline">
            Privatumo politika
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
