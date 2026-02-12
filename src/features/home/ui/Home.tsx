import { Link } from "inferno-router";
import FlashlightOverlay from "./components/FlashlightOverlay";
import { withBase } from "src/shared/base";
import { Helmet } from "inferno-helmet";

export default function Home() {
    return (
        <section className="relative w-screen h-dvh overflow-hidden bg-[url('/images/door-security.png')] xl:bg-[url('/images/door.png')] bg-left bg-center bg-cover bg-no-repeat">
            <Helmet>
                <title>GTFO Progress — Log Tracker & R8A2 Password</title>
                <meta
                    name="description"
                    content="Track your GTFO log progression and get the current weekly R8A2 secondary password."
                />
                <meta name="keywords" content="gtfo progress, gtfo log tracker, gtfo logs, gtfo log progression, gtfo player.log parser, gtfo read all logs, achievement_readalllogs, D-Lock Block Decipherer, D-Lock Block Decipherer achievement, r8a2 password, r8a2 secondary password, weekly r8a2 password, gtfo r8a2 password, gtfo tools" />
                <link rel="canonical" href="https://sofiane-77.github.io/gtfo/" />
                <meta property="og:url" content="https://sofiane-77.github.io/gtfo/" />
                <meta
                    property="og:title"
                    content="GTFO Progress — Log Tracker & R8A2 Password"
                />
                <meta
                    property="og:description"
                    content="Track your GTFO log progression and get the current weekly R8A2 secondary password."
                />
                <meta
                    property="og:image"
                    content="https://sofiane-77.github.io/gtfo/images/og/home.jpg"
                />

                <meta
                    name="twitter:title"
                    content="GTFO Progress — Log Tracker & R8A2 Password"
                />
                <meta
                    name="twitter:description"
                    content="Track your GTFO log progression and get the current weekly R8A2 secondary password."
                />
                <meta property="twitter:url" content="https://sofiane-77.github.io/gtfo/" />
                <meta
                    name="twitter:image"
                    content="https://sofiane-77.github.io/gtfo/images/og/home.jpg"
                />
            </Helmet>
            <FlashlightOverlay nightStartHour={19} nightEndHour={7} />

            <Link className="group terminalLink absolute inline-block left-(--home-terminal-link-left) bottom-(--home-terminal-link-bottom)" to={withBase("/logs")} aria-label="Ouvrir le terminal">
                <img className="
                block w-auto h-[80dvh] 2xl:min-h-[40.5vmax]
                cursor-pointer transition-transform transition-filter duration-200
                group-hover:scale-[1.01] group-hover:brightness-110
                
                [@media(hover:none)]:[animation:var(--zoom-bright)]
                " src="images/terminal.png" alt="Terminal" />
            </Link>
            <Link className="group securityLink hidden xl:inline-block absolute right-[23vw] bottom-[40.5vh]" to={withBase("/r8a2")} aria-label="Voir la sécurité">
                <img className="
                block w-[10dvw] h-auto
                cursor-pointer transition-transform transition-filter duration-200
                group-hover:scale-[1.01] group-hover:brightness-110

                [@media(hover:none)]:[animation:var(--zoom-bright)]
                " src="images/security.png" alt="Security" />
            </Link>
        </section>
    );
}