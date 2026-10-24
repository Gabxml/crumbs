import { useEffect, useState } from "react";
import { Folder } from "@untitledui/icons/Folder";
import { Heart } from "@untitledui/icons/Heart";
import { Image01 } from "@untitledui/icons/Image01";
import { UserPlus01 } from "@untitledui/icons/UserPlus01";
import { ButtonLink } from "../components/Button";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "../components/ThemeToggle";
import Wordmark from "../components/Wordmark";

// The three nouns the app is actually made of. Kept in one list so the icons and
// the headings cannot come apart, and written from what the routes really do —
// no claim here that the product does not make.
const FEATURES = [
  {
    Icon: Folder,
    title: "Collections",
    body: "Rows, checklists, dates, links and photos in one shared place. Make one for a trip or a course, and hand it to somebody else without keeping a copy.",
  },
  {
    Icon: Image01,
    title: "Crumbs",
    body: "A timeline of photos — yours, or your friends’ if you let them in.",
  },
  {
    Icon: UserPlus01,
    title: "Friends",
    body: "Find people by username, follow what they are planning, and share a collection with them in a tap.",
  },
];

/**
 * A masthead, not a nav bar.
 *
 * It cannot be a nav bar: signed out there are only three reachable places —
 * this page, log in, and sign up — and six links to nowhere would be worse than
 * none. So it is the wordmark, the theme, and the two ways in, which is all a
 * page like this actually needs.
 *
 * It is not there at all until you scroll down, and it leaves again the moment
 * you scroll up. The hero is a full screen of moving picture with the words on
 * it, and a bar sitting across that is a thing to look past; a bar that
 * reappears when you have clearly started reading is not.
 *
 * The account links turn over with the session, which is the one thing on this
 * page that has to know whether it is being shown to somebody signed in.
 *
 * Direction, not position, is the test — which is why the listener keeps the last
 * scroll offset rather than a threshold. One state to hold and one comparison per
 * frame, coalesced into an animation frame so a fast flick cannot queue a
 * re-render per event.
 */
function Masthead() {
  const { user, loading } = useAuth();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const now = window.scrollY;
        // Down and past the top of the hero, reveal. Up, or back at the very top,
        // take it away again.
        setShown(now > 40 && now > last);
        last = now;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-20 border-b bg-surface/85 backdrop-blur-xl transition duration-300 ease-ios motion-reduce:transition-none ${
        shown
          ? "translate-y-0 border-inactive"
          : "-translate-y-full border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-6">
        <Wordmark className="w-[112px]" />

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {/* The account links turn over with the session: two ways in when
              nobody is signed in, one when somebody is. Nothing at all while it
              is still resolving, because flashing "Log in" at someone who is
              already signed in is worse than showing no links for a frame. */}
          <nav aria-label="Account" className="flex items-center gap-1">
            {!loading &&
              (user ? (
                <ButtonLink to="/collections" variant="primary">
                  Home
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/login" variant="tertiary">
                    Log in
                  </ButtonLink>
                  <ButtonLink to="/register" variant="primary">
                    Sign up
                  </ButtonLink>
                </>
              ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  // A looping background video is motion nobody asked for, and the app already
  // honours prefers-reduced-motion for everything it draws — so it is not played
  // to anyone who has asked for less of it. Read once on mount rather than kept
  // in an effect: the choice cannot change under us, and the poster underneath is
  // the same gradient, so what they get instead is a still frame of it rather
  // than a black rectangle.
  const [still] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <>
      <Masthead />

      {/* The whole first screen is the animation, with the words laid over it. The
          same mesh gradient the two auth pages are built on, so the sign-up flow
          is already familiar by the time it asks — and in motion, which is the
          one thing a static background can never be.

          `object-cover` rather than `contain`: 1937x1089 against a phone in
          portrait has to crop enormously, and a blurred gradient has no feature
          to lose by cropping, whereas containing it would letterbox.

          The words on it are fixed navy rather than themed, same as on the auth
          banner: the artwork is a light blue in both modes and near-white type on
          it would be unreadable in dark. */}
      <section className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden">
        <video
          aria-hidden="true"
          autoPlay={!still}
          muted
          loop
          playsInline
          preload={still ? "none" : "auto"}
          poster="/auth-mesh-gradient.svg"
          className="absolute inset-0 -z-10 size-full object-cover"
        >
          <source src="/landing-hero.webm" type="video/webm" />
        </video>

        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 py-28 text-center">
          <h1 className="max-w-[23ch] text-[52px] leading-[1.08] font-regular tracking-heading text-bg lg:text-[72px]">
            Crumbs help you plan and remember your next
            <br />
            <strong className="font-bold italic">core memory.</strong>
          </h1>

          <p className="pt-4 max-w-[46ch] text-[20px] leading-relaxed text-code-bg lg:text-[24px]">
            Collections for the plans, crumbs for the photos, and the people you
            made them with.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink
              to="/register"
              variant="primary"
              className="border-2 border-blue-200 px-5 py-3 text-white"
            >
              Sign up
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" className="px-5 py-3">
              Log in
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1100px] px-6 py-20">
        <h2 className="sr-only">What Crumbs is for</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full space-y-3">
                <span className="grid size-10 place-items-center rounded-control bg-accent-tint text-accent">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="text-[19px] font-semibold tracking-heading text-text-h">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-text">{body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing band. Deliberately NOT the mesh gradient again — it has already
          been the loudest thing on the page once, and repeating it would flatten
          the hero into wallpaper. A panel on the grey canvas instead. */}
      <section className="bg-code-bg">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 py-20 text-center">
          <h2 className="max-w-[20ch] text-[30px] leading-[1.1] font-semibold tracking-heading text-text-h lg:text-[36px]">
            Start with the next thing on your list
          </h2>
          <p className="pt-4 max-w-[44ch] text-[16px] leading-relaxed text-text">
            An account is all it takes. Make a collection, <br></br> upload your day,
            and make friends.
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/register" className="px-5 py-3">
              Start leaving your crumbs
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* No links in here. The only things a signed-out visitor can reach are two
          forms up in the masthead, and repeating them at the far end of the page
          is a second way to do the one thing already on screen. The wordmark
          stays: it is the way back to the top of the page and to the landing
          page, not a menu. */}
      <footer className="border-t border-inactive bg-surface">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Wordmark className="w-[104px]" />

          <p className="flex items-center gap-1.5 text-[14px] text-text">
            Made with
            <Heart
              fill="currentColor"
              size={15}
              strokeWidth={1.75}
              aria-hidden="true"
              className="text-accent"
            />{" "}
            From gabxml, 37craven, &amp; halamikel
          </p>
        </div>
      </footer>
    </>
  );
}
