import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Sparkles,
  User2,
  Users2,
} from "lucide-react";
import { useStore } from "../store/useStore";

export default function SelectRole() {
  const setRole = useStore((s) => s.setRole);
  const setCurrentMemberId = useStore((s) => s.setCurrentMemberId);
  const members = useStore((s) => s.members);
  const navigate = useNavigate();

  useEffect(() => {
    // ensure default demo user for member
    if (!members.some((m) => m.id === "m-alex")) {
      setCurrentMemberId(members[0].id);
    }
  }, [members, setCurrentMemberId]);

  const enterAsMember = (id: string) => {
    setRole("member");
    setCurrentMemberId(id);
    navigate("/member");
  };
  const enterAsCoach = () => {
    setRole("coach");
    navigate("/coach");
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="relative isolate mx-auto grid min-h-screen max-w-5xl grid-cols-1 lg:grid-cols-2">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="flex flex-col justify-between p-6 sm:p-10">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-bold text-lime-300">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400/15 ring-1 ring-lime-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              </span>
              Volvere Club
              <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                Prototipas
              </span>
            </div>

            <div className="mt-14 max-w-md">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-300">
                <Sparkles className="h-3 w-3" /> Bėgikai ir treneriai
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Bėkite išmaniau. Treniruokitės kartu. Sekite viską.
              </h1>
              <p className="mt-4 text-lg text-white/70">
                Viena programėlė nariams — registruotis į treniruotes, sekti
                planus ir kilti rezultatų lentelėse — ir treneriams valdyti
                klubą.
              </p>
            </div>
          </div>
          <ul className="mt-10 hidden gap-2 text-sm text-white/60 sm:grid">
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-lime-400" /> Realistiški
              duomenys — registracija nereikalinga.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-lime-400" /> Bet kada
              perjunkite tarp kelių demonstracinių narių ir trenerių.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-lime-400" /> Prototipo
              mokėjimų srautas — aiškiai pažymėtas kaip simuliuotas.
            </li>
          </ul>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-t-3xl bg-white p-6 text-ink-900 shadow-pop sm:p-10 lg:rounded-none lg:rounded-l-3xl">
          <h2 className="font-display text-xl font-bold">Pasirinkite vaidmenį</h2>
          <p className="text-sm text-ink-500">
            Pasirinkite vaidmenį, kad pradėtumėte išbandyti prototipą. Vaidmenį
            galite pakeisti bet kuriuo metu.
          </p>

          <button
            type="button"
            onClick={() => enterAsMember("m-alex")}
            className="group flex items-center gap-4 rounded-2xl border border-ink-200 p-4 text-left transition-all hover:border-ink-900 hover:shadow-card"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-100 text-lime-800">
              <User2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink-900">Tęsti kaip narys</p>
              <p className="text-sm text-ink-500">
                Prisijungti kaip Alex Morgan · 100 m sprintas · Apmokėta
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-ink-900" />
          </button>

          <button
            type="button"
            onClick={() => enterAsMember("m-david")}
            className="group flex items-center gap-4 rounded-2xl border border-ink-200 p-4 text-left transition-all hover:border-ink-900 hover:shadow-card"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink-900">
                Tęsti kaip narys su vėluojančiu mokėjimu
              </p>
              <p className="text-sm text-ink-500">
                David Park · 5 km · Mokėjimas vėluoja
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-ink-900" />
          </button>

          <button
            type="button"
            onClick={enterAsCoach}
            className="group flex items-center gap-4 rounded-2xl bg-ink-950 p-4 text-left text-white transition-all hover:bg-ink-800"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-ink-950">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Tęsti kaip treneris</p>
              <p className="text-sm text-white/70">
                Trenerė Elena Ruiz · Sprintas ir technika
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/70 group-hover:text-white" />
          </button>

          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
            <p className="font-semibold text-ink-800">Prototipo demonstracija</p>
            Tikra autentifikacija nenaudojama. Duomenys saugomi lokaliai jūsų
            naršyklėje ir gali būti atstatyti Profilio ekrane.
          </div>
        </div>
      </div>
    </div>
  );
}
