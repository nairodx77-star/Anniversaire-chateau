import { useEffect, useMemo, useState } from "react";
import {
  Bath,
  BedDouble,
  CalendarDays,
  Castle,
  ChevronRight,
  Download,
  Dumbbell,
  Fish,
  GlassWater,
  House,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
  Trash2,
  TreePine,
  Users,
  Waves,
} from "lucide-react";
import { getAllSleepSlots, getRoomCapacity, rooms } from "./data/rooms";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const ADMIN_CODE = "1977";

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function formatReservationDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeReservations(rows) {
  const result = {};

  rows.forEach((row) => {
    result[row.slot_id] = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone || "",
      slotId: row.slot_id,
      roomId: row.room_id,
      roomName: row.room_name,
      building: row.building,
      bedLabel: row.bed_label,
      sleepNumber: row.sleep_number,
      createdAt: row.created_at,
    };
  });

  return result;
}

export default function App() {
  const [reservations, setReservations] = useState({});
  const [activeRoomId, setActiveRoomId] = useState(rooms[0].id);
  const [buildingFilter, setBuildingFilter] = useState("Tous");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState("");

  const allSlots = useMemo(() => getAllSleepSlots(), []);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || rooms[0],
    [activeRoomId]
  );

  const activeRoomSlots = useMemo(
    () => allSlots.filter((slot) => slot.roomId === activeRoom.id),
    [allSlots, activeRoom]
  );

  const filteredRooms = useMemo(() => {
    if (buildingFilter === "Tous") return rooms;
    return rooms.filter((room) => room.building === buildingFilter);
  }, [buildingFilter]);

  const stats = useMemo(() => {
    const totalSlots = allSlots.length;
    const bookedSlots = Object.keys(reservations).length;

    return {
      totalSlots,
      bookedSlots,
      remainingSlots: totalSlots - bookedSlots,
      bookedRooms: rooms.filter((room) =>
        allSlots
          .filter((slot) => slot.roomId === room.id)
          .some((slot) => reservations[slot.id])
      ).length,
    };
  }, [allSlots, reservations]);

  async function fetchReservations() {
    if (!isSupabaseConfigured || !supabase) {
      setSystemMessage(
        "Supabase n’est pas encore configuré. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel."
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erreur chargement Supabase:", error);
      setSystemMessage(
        `Impossible de charger les réservations : ${error.message}`
      );
      setLoading(false);
      return;
    }

    setReservations(normalizeReservations(data || []));
    setLoading(false);
  }

  useEffect(() => {
    fetchReservations();

    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("reservations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleReserve(event) {
    event.preventDefault();

    setSystemMessage("");

    const firstName = guestFirstName.trim();
    const lastName = guestLastName.trim();

    if (!selectedSlotId || !firstName || !lastName) {
      setSystemMessage("Sélectionne un couchage et renseigne le prénom et le nom.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setSystemMessage("Supabase n’est pas configuré : réservation impossible.");
      return;
    }

    if (reservations[selectedSlotId]) {
      setSystemMessage("Ce couchage est déjà réservé.");
      return;
    }

    const slot = allSlots.find((item) => item.id === selectedSlotId);

    if (!slot) {
      setSystemMessage("Couchage introuvable.");
      return;
    }

    const payload = {
      slot_id: selectedSlotId,
      room_id: slot.roomId,
      room_name: slot.roomName,
      building: slot.building,
      bed_label: slot.bedLabel,
      sleep_number: slot.sleepNumber,
      first_name: firstName,
      last_name: lastName,
      phone: guestPhone.trim() || null,
    };

    const { error } = await supabase.from("reservations").insert(payload);

    if (error) {
      console.error("Erreur insertion Supabase:", error);
      setSystemMessage(
        `Réservation impossible : ${error.message}`
      );
      await fetchReservations();
      return;
    }

    setGuestFirstName("");
    setGuestLastName("");
    setGuestPhone("");
    setSelectedSlotId("");
    setSystemMessage("Réservation enregistrée.");
    await fetchReservations();
  }

  async function removeReservation(slotId) {
    const reservation = reservations[slotId];

    if (!reservation?.id) return;

    if (!isSupabaseConfigured || !supabase) {
      setSystemMessage("Supabase n’est pas configuré : suppression impossible.");
      return;
    }

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation.id);

    if (error) {
      console.error("Erreur suppression Supabase:", error);
      setSystemMessage(`Suppression impossible : ${error.message}`);
      return;
    }

    setSystemMessage("Réservation supprimée.");
    await fetchReservations();
  }

  function exportCsv() {
    const rows = [
      [
        "Bâtiment",
        "Chambre",
        "Lit",
        "Couchage",
        "Statut",
        "Prénom",
        "Nom",
        "Téléphone",
        "Date de réservation",
      ],
      ...allSlots.map((slot) => {
        const reservation = reservations[slot.id];
        return [
          slot.building,
          slot.roomName,
          slot.bedLabel,
          `Couchage ${slot.sleepNumber}`,
          reservation ? "Réservé" : "Libre",
          reservation?.firstName || "",
          reservation?.lastName || "",
          reservation?.phone || "",
          formatReservationDate(reservation?.createdAt),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reservations-couchages-dorian-erwan.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function unlockAdmin(event) {
    event.preventDefault();

    if (adminCode.trim() === ADMIN_CODE) {
      setAdminUnlocked(true);
      setSystemMessage("");
    } else {
      setSystemMessage("Code organisateur incorrect.");
    }
  }

  function scrollToReservation() {
    document.getElementById("reservation")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="site">
      <Header onReserveClick={scrollToReservation} />

      <main>
        <Hero onReserveClick={scrollToReservation} />

        <section className="section intro-section" id="domaine">
          <div className="container split">
            <div>
              <p className="eyebrow">Le domaine</p>
              <h2>Une belle demeure pour un week-end qui sort de l’ordinaire.</h2>
            </div>

           <div className="text-block">
  <p>
    Pour nos 40 ans, on avait deux options : accepter dignement le temps
    qui passe… ou privatiser un château du XIXe siècle pour faire comme
    si tout allait très bien. On a choisi la deuxième option.
  </p>

  <p>
    On vous invite donc à passer un week-end en dehors du temps, au cœur
    de la nature, dans une grande demeure pleine de charme, avec des
    chambres pour dormir — un peu —, des espaces pour se retrouver, des
    activités pour se divertir, et surtout une belle piscine qui devrait
    devenir le théâtre officiel des meilleurs rosés du week-end.
  </p>

  <p>
    Évidemment, le champagne sera de la partie. Parce qu’à 40 ans, on ne
    vieillit pas : on millésime.
  </p>
</div>
          </div>
        </section>

        <section className="section image-story">
          <div className="container image-story-grid">
            <div className="story-card large">
              <img src="/images/domaine.jpg" alt="Domaine de la Haute-Porte" />
              <div>
                <span>Nature & élégance</span>
                <strong>Parc, bois, rivière et grands espaces</strong>
              </div>
            </div>

            <div className="story-card">
              <img src="/images/piscine.jpg" alt="Piscine du domaine" />
              <div>
                <span>Piscine</span>
                <strong>Un week-end pour profiter, pas pour courir</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section activities-section" id="activites">
          <div className="container">
            <div className="section-heading centered">
              <p className="eyebrow">Sur place</p>
              <h2>Activités, piscine et art de vivre.</h2>
              <p>
                Rien d’obligatoire. L’idée, c’est de profiter du lieu, du moment
                et des gens.
              </p>
            </div>

            <div className="activity-grid">
              <Activity
                icon={<Waves />}
                title="Piscine"
                text="Pour profiter du domaine entre deux verres et trois discussions."
              />
              <Activity
                icon={<TreePine />}
                title="Balades"
                text="Parc, chemins, nature et coins tranquilles pour respirer."
              />
              <Activity
                icon={<Fish />}
                title="Pêche"
                text="Une activité calme pour ceux qui aiment disparaître deux heures."
              />
              <Activity
                icon={<Dumbbell />}
                title="Jeux & extérieur"
                text="Volley, croquet, trampoline, grands espaces et esprit maison de vacances."
              />
              <Activity
                icon={<GlassWater />}
                title="Apéro"
                text="Moment central du programme. La rigueur impose de le mentionner."
              />
              <Activity
                icon={<Bath />}
                title="Détente"
                text="Un lieu fait pour ralentir, discuter, rire et dormir un peu."
              />
            </div>
          </div>
        </section>

        <section className="section reservation-section" id="reservation">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Réservation des couchages</p>
              <h2>Choisis ta chambre, puis réserve ton couchage.</h2>
              <p>
                La réservation se fait à la maille du couchage. Un lit double
                correspond donc à deux couchages réservables.
              </p>
            </div>

            {systemMessage && (
              <div className="system-message">{systemMessage}</div>
            )}

            <div className="stats-grid">
              <Stat
                icon={<BedDouble />}
                label="Couchages réservés"
                value={`${stats.bookedSlots}/${stats.totalSlots}`}
              />
              <Stat
                icon={<Users />}
                label="Couchages restants"
                value={stats.remainingSlots}
              />
              <Stat
                icon={<House />}
                label="Chambres utilisées"
                value={`${stats.bookedRooms}/${rooms.length}`}
              />
            </div>

            <div className="booking-layout">
              <aside className="room-list">
                <div className="room-list-top">
                  <h3>Chambres</h3>

                  <div className="filters">
                    <button
                      className={buildingFilter === "Tous" ? "active" : ""}
                      onClick={() => setBuildingFilter("Tous")}
                    >
                      Tous
                    </button>
                    <button
                      className={buildingFilter === "Château" ? "active" : ""}
                      onClick={() => setBuildingFilter("Château")}
                    >
                      Château
                    </button>
                    <button
                      className={buildingFilter === "La Ferme" ? "active" : ""}
                      onClick={() => setBuildingFilter("La Ferme")}
                    >
                      Ferme
                    </button>
                  </div>
                </div>

                <div className="room-buttons">
                  {filteredRooms.map((room) => {
                    const capacity = getRoomCapacity(room);
                    const roomSlots = allSlots.filter(
                      (slot) => slot.roomId === room.id
                    );
                    const booked = roomSlots.filter(
                      (slot) => reservations[slot.id]
                    ).length;

                    return (
                      <button
                        key={room.id}
                        className={`room-button ${
                          activeRoom.id === room.id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setActiveRoomId(room.id);
                          setSelectedSlotId("");
                        }}
                      >
                        <span>
                          <strong>{room.name}</strong>
                          <small>
                            {room.building} · {room.atmosphere}
                          </small>
                        </span>
                        <em>
                          {booked}/{capacity}
                        </em>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="room-detail">
                <div className="room-visual">
                  <img src={activeRoom.image} alt={activeRoom.name} />
                  <div className="room-badge">{activeRoom.building}</div>
                </div>

                <div className="room-content">
                  <div className="room-title-row">
                    <div>
                      <p className="eyebrow small">{activeRoom.atmosphere}</p>
                      <h3>{activeRoom.name}</h3>
                    </div>

                    <div className="capacity-pill">
                      {getRoomCapacity(activeRoom)} couchages
                    </div>
                  </div>

                  <p className="room-description">{activeRoom.description}</p>

                  {loading ? (
                    <p className="form-help">Chargement des réservations…</p>
                  ) : (
                    <div className="sleep-list">
                      {activeRoomSlots.map((slot) => {
                        const reservation = reservations[slot.id];
                        const isSelected = selectedSlotId === slot.id;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={Boolean(reservation)}
                            className={`sleep-slot ${
                              reservation ? "booked" : ""
                            } ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedSlotId(slot.id)}
                          >
                            <div>
                              <strong>{slot.bedLabel}</strong>
                              <span>Couchage {slot.sleepNumber}</span>
                            </div>

                            {reservation ? (
                              <em>
                                Réservé par {reservation.firstName}{" "}
                                {reservation.lastName}
                              </em>
                            ) : (
                              <em>Libre</em>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <form className="reservation-form" onSubmit={handleReserve}>
                    <h4>Réserver le couchage sélectionné</h4>

                    <div className="form-grid">
                      <label>
                        Prénom
                        <input
                          value={guestFirstName}
                          onChange={(event) =>
                            setGuestFirstName(event.target.value)
                          }
                          placeholder="Ex : Julie"
                        />
                      </label>

                      <label>
                        Nom
                        <input
                          value={guestLastName}
                          onChange={(event) =>
                            setGuestLastName(event.target.value)
                          }
                          placeholder="Ex : Martin"
                        />
                      </label>
                    </div>

                    <label>
                      Téléphone facultatif
                      <input
                        value={guestPhone}
                        onChange={(event) =>
                          setGuestPhone(event.target.value)
                        }
                        placeholder="En cas de besoin"
                      />
                    </label>

                    <button
  type="submit"
  className="primary-button"
  disabled={!selectedSlotId || loading}
>
  Réserver ce couchage
  <ChevronRight size={18} />
</button>

{systemMessage && (
  <p className="form-help" style={{ fontWeight: 700 }}>
    {systemMessage}
  </p>
)}

{!selectedSlotId && (
  <p className="form-help">
    Sélectionne d’abord un couchage libre dans la chambre.
  </p>
)}
                  </form>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="section practical-section" id="infos">
          <div className="container practical-grid">
            <div>
              <p className="eyebrow">Infos pratiques</p>
              <h2>Adresse, arrivée et départ.</h2>
              <p>
                Les détails définitifs pourront être ajustés, mais voici la base
                pour vous organiser.
              </p>
            </div>

            <div className="info-cards">
              <InfoCard
                icon={<MapPin />}
                title="Adresse"
                text="Domaine de la Haute-Porte, La Haute-Porte, 72300 Souvigné-sur-Sarthe."
              />
              <InfoCard
                icon={<CalendarDays />}
                title="Arrivée"
                text="Arrivée prévue à partir de 16h. L’horaire exact sera confirmé avant le week-end. Le départ se fera en début d'après-midi"
              />
              <InfoCard
  icon={<GlassWater />}
  title="Frais"
  text="Pour le logement, une participation aux frais de 165 € par personne sera demandée. Pour le champagne, le rosé, les bières et les repas, on s’en occupe. Pour les autres alcools, il est fortement apprécié de ramener de quoi s’amuser :)"
/>
              <InfoCard
                icon={<Castle />}
                title="Esprit du week-end"
                text="Chic mais détendu. Venez beaux, venez simples, venez surtout avec votre bonne humeur."
              />
            </div>
          </div>
        </section>

        <section className="section admin-section">
          <div className="container admin-box">
            <div>
              <p className="eyebrow">Organisateurs</p>
              <h2>Suivi des réservations</h2>
              <p>
                Espace discret pour Dorian & Erwan : export CSV et suppression
                d’une réservation si quelqu’un se trompe.
              </p>
            </div>

            {!adminUnlocked ? (
              <form className="admin-form" onSubmit={unlockAdmin}>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(event) => setAdminCode(event.target.value)}
                  placeholder="Code organisateur"
                />
                <button>Déverrouiller</button>
              </form>
            ) : (
              <div className="admin-panel">
                <button className="secondary-button" onClick={exportCsv}>
                  <Download size={18} />
                  Exporter les réservations
                </button>

                <div className="admin-list">
                  {allSlots.map((slot) => {
                    const reservation = reservations[slot.id];

                    return (
                      <div key={slot.id} className="admin-row">
                        <div>
                          <strong>{slot.roomName}</strong>
                          <span>
                            {slot.bedLabel} · Couchage {slot.sleepNumber}
                          </span>
                        </div>

                        {reservation ? (
                          <>
                            <em>
                              {reservation.firstName} {reservation.lastName}
                            </em>
                            <button
                              className="delete-button"
                              onClick={() => removeReservation(slot.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <em>Libre</em>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <span>Dorian & Erwan · 40 ans</span>
          <span>Domaine de la Haute-Porte</span>
        </div>
      </footer>
    </div>
  );
}
function Header({ onReserveClick }) {
  return (
    <header className="header">
      <a href="#" className="brand">
        <Castle size={20} />
        <span>D & E</span>
      </a>

      <nav>
        <a href="#domaine">Le domaine</a>
        <a href="#activites">Activités</a>
        <a href="#reservation">Couchages</a>
        <a href="#infos">Infos pratiques</a>
      </nav>

      <button onClick={onReserveClick}>Réserver</button>
    </header>
  );
}

function Hero({ onReserveClick }) {
  return (
    <section className="hero hero-luxury">
      <img
        src="/images/chateau.jpg"
        alt="Domaine de la Haute-Porte"
        className="hero-image"
      />

      <div className="hero-overlay" />

<div className="hero-left-stack">
  <div className="hero-left-card hero-left-card-top">
    <img src="/images/dorian2.jpg" alt="Dorian et Erwan" />
  </div>

  <div className="hero-left-card hero-left-card-bottom">
    <img src="/images/dorian.jpg" alt="Dorian et Erwan" />
  </div>
</div>

      <div className="hero-gallery hero-gallery-right">
        <div className="hero-gallery-card hero-gallery-card-main">
          <img src="/images/Chateau-devant.jpg" alt="Façade du château" />
        </div>

        <div className="hero-gallery-card hero-gallery-card-secondary">
          <img src="/images/Salon2.jpg" alt="Salon du château" />
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-kicker">
          <Sparkles size={16} />
          Invitation privée
        </div>

        <h1>Dorian & Erwan vous invitent pour leurs 40 ans.</h1>

        <p>
          Pour fêter ça dignement, rendez-vous dans une belle demeure de
          caractère : piscine, grands espaces, chambres de charme et un week-end
          pensé pour profiter ensemble.
        </p>

        <div className="hero-actions">
          <button className="primary-button light" onClick={onReserveClick}>
            Réserver mon couchage
            <ChevronRight size={18} />
          </button>

          <a href="#domaine" className="ghost-link">
            Découvrir le domaine
          </a>
        </div>

        <div className="hero-facts">
          <span>
            <MapPin size={16} />
            Souvigné-sur-Sarthe
          </span>
          <span>
            <BedDouble size={16} />
            30 couchages
          </span>
          <span>
            <Palmtree size={16} />
            Piscine & parc
          </span>
        </div>
      </div>
    </section>
  );
}

function Activity({ icon, title, text }) {
  return (
    <article className="activity-card">
      <div className="activity-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <article className="info-card">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
