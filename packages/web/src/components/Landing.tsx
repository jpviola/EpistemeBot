import Link from "next/link";
import { MemphisBackground } from "./MemphisBackground";
import s from "./Landing.module.css";

const TOOLS = [
  { icon: "🤖", name: "Tutor socrático",       desc: "Preguntas filosóficas con contexto ontológico verificado y genealogías conceptuales.",  tag: "Disponible", tagColor: "teal"   },
  { icon: "⚡", name: "Debate socrático",       desc: "Planteá una tesis y el tutor la desafiará con argumentos filosóficos estructurados.",   tag: "Disponible", tagColor: "coral"  },
  { icon: "📅", name: "Línea de tiempo",        desc: "Generá líneas de tiempo interactivas de corrientes filosóficas, períodos o autores.",    tag: "Próximamente", tagColor: "yellow" },
  { icon: "🗺️", name: "Infografía conceptual", desc: "Visualizá relaciones entre conceptos, autores y escuelas en mapas semánticos.",           tag: "Próximamente", tagColor: "yellow" },
  { icon: "📋", name: "Plan de estudio",        desc: "Armá un programa de lecturas y actividades adaptado a tu nivel y tus objetivos.",         tag: "Próximamente", tagColor: "yellow" },
  { icon: "📖", name: "Metodologías de estudio", desc: "Técnicas probadas: Feynman, Pomodoro, mapas conceptuales, lectura activa y más.",        tag: "Próximamente", tagColor: "yellow" },
  { icon: "💡", name: "Pensamiento crítico",    desc: "Ejercicios de argumentación, falacias, análisis de textos y construcción de juicios.",   tag: "Próximamente", tagColor: "yellow" },
  { icon: "🏆", name: "Gamificación",           desc: "XP, niveles, insignias, rachas y ranking global para mantener la motivación.",           tag: "Disponible", tagColor: "purple" },
];

const PLANS = [
  {
    name: "Libre",
    price: "Gratis",
    period: "",
    accent: "teal",
    desc: "Para explorar la plataforma",
    features: [
      "20 preguntas al tutor por mes",
      "Modo tutor socrático",
      "4 niveles pedagógicos",
      "Historial de 3 conversaciones",
      "Gamificación básica",
    ],
    missing: [
      "Debate socrático",
      "Herramientas avanzadas",
      "Plan de estudio personalizado",
      "Historial ilimitado",
    ],
    cta: "Empezar gratis",
    ctaHref: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$10",
    period: "/ mes",
    accent: "yellow",
    desc: "Para el estudiante comprometido",
    features: [
      "Tutor ilimitado",
      "Debate socrático ilimitado",
      "Línea de tiempo y infografías",
      "Plan de estudio personalizado",
      "Metodologías de estudio",
      "Pensamiento crítico",
      "Historial ilimitado",
      "Gamificación completa + ranking",
    ],
    missing: [],
    cta: "Empezar con Pro",
    ctaHref: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Institución",
    price: "$100",
    period: "/ mes",
    accent: "purple",
    desc: "Para escuelas y universidades",
    features: [
      "Todo lo de Pro",
      "Hasta 50 alumnos incluidos",
      "Dashboard docente avanzado",
      "Reportes de progreso grupal",
      "Configuración curricular",
      "Soporte prioritario",
      "Facturación institucional",
    ],
    missing: [],
    cta: "Contactar",
    ctaHref: "mailto:contacto@epistemebot.com",
    highlight: false,
  },
];

export function Landing() {
  return (
    <div className={s.page}>

      {/* ── Nav ── */}
      <nav className={s.nav}>
        <div className={s.navLogo}>
          Episteme<span className={s.navLogoAccent}>Bot</span>
        </div>
        <div className={s.navLinks}>
          <a href="#herramientas" className={s.navLink}>Herramientas</a>
          <a href="#diferencial"  className={s.navLink}>Por qué EpistemeBot</a>
          <a href="#precios"      className={s.navLink}>Precios</a>
          <Link href="/login"  className={s.navLogin}>Iniciar sesión</Link>
          <Link href="/register" className={s.navCta}>Probar gratis →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <MemphisBackground variant="cream">
        <section className={s.hero}>
          <div className={s.heroBadge}>
            <span className={s.heroBadgeDot} />
            Ontología semántica · Filosofía · Humanidades
          </div>

          <h1 className={s.heroTitle}>
            El tutor inteligente<br />
            para enseñar{" "}
            <span className={s.heroTitleAccent}>humanidades</span>
            <br />
            <span className={s.heroTitleAccent2}>sin alucinar.</span>
          </h1>

          <p className={s.heroSub}>
            No es un chatbot genérico. EpistemeBot razona sobre una ontología
            filosófica verificada — genealogías, prerrequisitos pedagógicos
            y 4 niveles de profundidad adaptados a cada alumno.
          </p>

          <div className={s.heroActions}>
            <Link href="/register" className={s.btnPrimary}>
              Empezar gratis →
            </Link>
            <a href="#precios" className={s.btnSecondary}>
              Ver precios
            </a>
          </div>

          {/* Preview */}
          <div className={s.previewWrap}>
            <div className={s.previewBar}>
              <div className={s.previewDot} style={{ background: "#FF6B6B" }} />
              <div className={s.previewDot} style={{ background: "#FFE566" }} />
              <div className={s.previewDot} style={{ background: "#4ECDC4" }} />
              <span className={s.previewBarLabel}>EpistemeBot · Tutor socrático</span>
            </div>
            <div className={s.previewBody}>
              <div className={s.previewMsg}>
                <div className={s.previewAvatar}>S</div>
                <div>
                  <div className={s.previewBubble}>
                    <strong>¿Qué critica Nietzsche de Platón?</strong>
                    <br /><br />
                    Antes de responder, te propongo algo: ¿qué sabés
                    sobre la teoría de las Ideas de Platón? La crítica
                    de Nietzsche solo tiene sentido si entendemos qué
                    está atacando — y por qué lo llama «el mayor error
                    de la filosofía occidental».
                  </div>
                  <div className={s.previewChips}>
                    <span className={s.previewChip}>→ Ideas (Platón)</span>
                    <span className={s.previewChip}>→ Nihilismo</span>
                    <span className={s.previewChipTeal}>Voluntad de poder</span>
                    <span className={s.previewChipTeal}>Friedrich Nietzsche</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={s.heroStats}>
            <div className={s.heroStat}><div className={s.heroStatNum}>613</div><div className={s.heroStatLabel}>triples semánticos</div></div>
            <div className={s.heroStat}><div className={s.heroStatNum}>10</div><div className={s.heroStatLabel}>filósofos nucleares</div></div>
            <div className={s.heroStat}><div className={s.heroStatNum}>25+</div><div className={s.heroStatLabel}>conceptos con prerrequisitos</div></div>
            <div className={s.heroStat}><div className={s.heroStatNum}>4</div><div className={s.heroStatLabel}>niveles pedagógicos</div></div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Herramientas ── */}
      <MemphisBackground variant="dark">
        <section className={s.toolsSection} id="herramientas">
          <div className={s.sectionInner}>
            <div className={s.diffLabel}>Suite completa</div>
            <h2 className={s.diffTitle}>Todo lo que necesitás<br />para aprender en serio.</h2>
            <p className={s.diffSub}>
              Un ecosistema de herramientas diseñadas alrededor de la ontología semántica.
              Cada función potencia las demás.
            </p>
            <div className={s.toolsGrid}>
              {TOOLS.map(tool => (
                <div key={tool.name} className={s.toolCard}>
                  <div className={s.toolCardTop}>
                    <span className={s.toolIcon}>{tool.icon}</span>
                    <span className={`${s.toolTag} ${s[`toolTag${tool.tagColor.charAt(0).toUpperCase() + tool.tagColor.slice(1)}`]}`}>
                      {tool.tag}
                    </span>
                  </div>
                  <div className={s.toolName}>{tool.name}</div>
                  <div className={s.toolDesc}>{tool.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Diferencial ── */}
      <MemphisBackground variant="cream">
        <section className={s.diffSection} id="diferencial">
          <div className={s.diffInner}>
            <div className={s.sectionLabel}>El núcleo real</div>
            <h2 className={s.sectionTitle}>Los LLMs genéricos<br />enseñan mal filosofía.</h2>
            <p className={s.sectionSubDark}>
              Simplifican, inventan, mezclan autores, pierden contexto histórico.
              EpistemeBot construye sobre una ontología curada — el modelo no alucina
              porque el conocimiento viene de la base semántica, no de su entrenamiento.
            </p>

            <div className={s.diffGrid}>
              {[
                { icon: "🗂️", title: "Ontología OWL + GraphDB", text: "Autores, conceptos, corrientes y argumentos representados como grafos semánticos con lógica formal." },
                { icon: "🔗", title: "Inferencia pedagógica",    text: "Si el alumno no entiende «alteridad», el sistema infiere que necesita primero «intersubjetividad»." },
                { icon: "🧭", title: "Genealogías conceptuales", text: "Cada concepto llega con su historia: quién lo desarrolló, a quién critica, qué presupone." },
                { icon: "🎓", title: "Adaptación por nivel",     text: "Secundario, CBC, universitario o especialista. Mismo concepto, profundidad completamente distinta." },
              ].map(card => (
                <div key={card.title} className={s.diffCard}>
                  <div className={s.diffIcon}>{card.icon}</div>
                  <div className={s.diffCardTitle}>{card.title}</div>
                  <div className={s.diffCardText}>{card.text}</div>
                </div>
              ))}
            </div>

            <div className={s.diffVs}>
              <div className={s.diffVsItem}>
                <div className={`${s.diffVsTag} ${s.diffVsTagBad}`}>✕ ChatGPT / Claude genérico</div>
                <ul className={s.diffVsList}>
                  <li>Responde desde entrenamiento estadístico</li>
                  <li>Puede inventar citas o mezclar autores</li>
                  <li>Sin contexto histórico estructurado</li>
                  <li>No sabe qué prerrequisitos le faltan al alumno</li>
                </ul>
              </div>
              <div className={s.diffVsDivider} />
              <div className={s.diffVsItem}>
                <div className={`${s.diffVsTag} ${s.diffVsTagGood}`}>✓ EpistemeBot</div>
                <ul className={`${s.diffVsList} ${s.diffVsListGood}`}>
                  <li>El contexto viene de la ontología verificada</li>
                  <li>Atribución de ideas con fuente ontológica</li>
                  <li>Períodos, corrientes y genealogías estructuradas</li>
                  <li>Inferencia de prerrequisitos por SPARQL</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Cómo funciona ── */}
      <MemphisBackground variant="yellow">
        <section className={s.howSection} id="como-funciona">
          <div className={s.sectionInner}>
            <div className={s.sectionLabel}>Arquitectura</div>
            <h2 className={s.sectionTitle}>Cómo funciona por dentro</h2>
            <p className={s.sectionSub}>
              Cada pregunta pasa por la ontología antes de llegar al modelo.
              La IA no improvisa — recibe contexto semántico verificado.
            </p>
            <div className={s.howGrid}>
              {[
                { n: "1", title: "El alumno pregunta",       text: "Cualquier pregunta en lenguaje natural. El sistema detecta entidades: autores, conceptos, corrientes." },
                { n: "2", title: "Consulta a la ontología",  text: "Queries SPARQL a GraphDB recuperan genealogías, prerrequisitos pedagógicos y relaciones semánticas." },
                { n: "3", title: "Inferencia pedagógica",    text: "El sistema infiere qué necesita saber el alumno primero y ajusta según su nivel educativo." },
                { n: "4", title: "Claude responde",          text: "El LLM recibe contexto ontológico verificado y construye una respuesta pedagógicamente fundada." },
              ].map(step => (
                <div key={step.n} className={s.howStep}>
                  <div className={s.howNum}>{step.n}</div>
                  <div className={s.howTitle}>{step.title}</div>
                  <div className={s.howText}>{step.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Precios ── */}
      <MemphisBackground variant="cream">
        <section className={s.pricingSection} id="precios">
          <div className={s.sectionInner}>
            <div className={s.sectionLabel}>Planes</div>
            <h2 className={s.sectionTitle}>Precios simples y transparentes</h2>
            <p className={s.sectionSub}>
              Empezá gratis. Escalá cuando lo necesitás.
              Sin contratos, cancelación en cualquier momento.
            </p>

            <div className={s.pricingGrid}>
              {PLANS.map(plan => (
                <div
                  key={plan.name}
                  className={`${s.pricingCard} ${plan.highlight ? s.pricingCardHighlight : ""}`}
                >
                  {plan.highlight && (
                    <div className={s.pricingBadge}>Más popular</div>
                  )}
                  <div className={s.planName}>{plan.name}</div>
                  <div className={s.planPriceRow}>
                    <span className={s.planPrice}>{plan.price}</span>
                    {plan.period && <span className={s.planPeriod}>{plan.period}</span>}
                  </div>
                  <div className={s.planDesc}>{plan.desc}</div>

                  <ul className={s.planFeatures}>
                    {plan.features.map(f => (
                      <li key={f} className={s.planFeatureItem}>
                        <span className={s.featureCheck}>✓</span>
                        {f}
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className={`${s.planFeatureItem} ${s.planFeatureMissing}`}>
                        <span className={s.featureCross}>✕</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.ctaHref}
                    className={`${s.planCta} ${plan.highlight ? s.planCtaHighlight : ""}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>

            <p className={s.pricingNote}>
              ¿Institución grande o necesitás más de 50 alumnos?{" "}
              <a href="mailto:contacto@epistemebot.com" className={s.pricingNoteLink}>
                Escribinos para una propuesta a medida →
              </a>
            </p>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Para quién ── */}
      <MemphisBackground variant="dark">
        <section className={s.forSection} id="para-quien">
          <div className={s.sectionInner}>
            <div className={s.diffLabel}>Audiencia</div>
            <h2 className={s.diffTitle}>Diseñado para el contexto argentino</h2>
            <p className={s.diffSub}>
              Filosofía, humanidades y ética desde el secundario hasta la especialización.
            </p>
            <div className={s.forGrid}>
              <div className={s.forCard}>
                <div className={s.forCardIcon}>📚</div>
                <div className={s.forCardTitle}>Estudiantes</div>
                <div className={s.forCardText}>
                  Desde los últimos años del secundario hasta el primer tramo universitario.
                  Un tutor que explica bien, no que hace la tarea.
                </div>
                <ul className={s.forCardList}>
                  <li>5to y 6to año del secundario</li>
                  <li>CBC / Ingreso universitario (UBA y equivalentes)</li>
                  <li>1er y 2do año de filosofía o humanidades</li>
                  <li>Materias de ética, historia y pensamiento crítico</li>
                </ul>
              </div>
              <div className={s.forCard}>
                <div className={s.forCardIcon}>🏫</div>
                <div className={s.forCardTitle}>Docentes e instituciones</div>
                <div className={s.forCardText}>
                  Herramienta de apoyo para clases de filosofía, seminarios
                  e institutos de formación docente.
                </div>
                <ul className={s.forCardList}>
                  <li>Profesores de filosofía y ética</li>
                  <li>Secundarios privados con orientación humanística</li>
                  <li>Universidades católicas y filosóficas</li>
                  <li>Institutos de formación docente</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── CTA final ── */}
      <MemphisBackground variant="cream">
        <section className={s.ctaSection}>
          <div className={s.ctaInner}>
            <h2 className={s.ctaTitle}>
              Filosofía bien enseñada.{" "}
              <span className={s.ctaTitleAccent}>Semánticamente.</span>
            </h2>
            <p className={s.ctaSub}>
              Probá el tutor ahora. Preguntá sobre Nietzsche, Levinas, Kant o Heidegger
              y sentí la diferencia entre un LLM genérico y un sistema semántico.
            </p>
            <div className={s.ctaActions}>
              <Link href="/register" className={s.btnPrimary}>
                Empezar gratis →
              </Link>
              <Link href="/tutor" className={s.btnSecondary}>
                Probar sin cuenta
              </Link>
            </div>
          </div>
        </section>
      </MemphisBackground>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerLeft}>
          <div className={s.footerLogo}>
            Episteme<span className={s.footerLogoAccent}>Bot</span>
          </div>
          <div className={s.footerTagline}>Plataforma semántica de educación en humanidades</div>
        </div>
        <div className={s.footerLinks}>
          <a href="#herramientas" className={s.footerLink}>Herramientas</a>
          <a href="#diferencial"  className={s.footerLink}>Diferencial</a>
          <a href="#precios"      className={s.footerLink}>Precios</a>
          <Link href="/login"     className={s.footerLink}>Ingresar</Link>
        </div>
        <div className={s.footerRight}>© 2025 EpistemeBot</div>
      </footer>

    </div>
  );
}
