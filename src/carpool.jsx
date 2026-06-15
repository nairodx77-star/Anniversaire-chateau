import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "./carpool.css";

const ADMIN_CODE = "1977";
const DEFAULT_SEATS = 2;

function CarpoolModule() {
  const [cars, setCars] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [driverFirstName, setDriverFirstName] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [departureZip, setDepartureZip] = useState("");
  const [availableSeats, setAvailableSeats] = useState(DEFAULT_SEATS);
  const [passengerNames, setPassengerNames] = useState({});
  const [adminCode, setAdminCode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [editingCarId, setEditingCarId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [message, setMessage] = useState("");

  const passengersByCar = useMemo(() => {
    return passengers.reduce((acc, passenger) => {
      if (!acc[passenger.car_id]) acc[passenger.car_id] = [];
      acc[passenger.car_id].push(passenger);
      return acc;
    }, {});
  }, [passengers]);

  async function fetchCarpool() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase n’est pas configuré : module covoiturage indisponible.");
      return;
    }

    const [{ data: carsData, error: carsError }, { data: passengersData, error: passengersError }] =
      await Promise.all([
        supabase.from("carpool_cars").select("*").order("created_at", { ascending: true }),
        supabase.from("carpool_passengers").select("*").order("created_at", { ascending: true }),
      ]);

    if (carsError || passengersError) {
      console.error("Erreur covoiturage:", carsError || passengersError);
      setMessage("Impossible de charger le module covoiturage.");
      return;
    }

    setCars(carsData || []);
    setPassengers(passengersData || []);
  }

  useEffect(() => {
    fetchCarpool();

    if (!isSupabaseConfigured || !supabase) return undefined;

    const channel = supabase
      .channel("carpool-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carpool_cars" },
        fetchCarpool
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carpool_passengers" },
        fetchCarpool
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function addCar(event) {
    event.preventDefault();
    setMessage("");

    const firstName = driverFirstName.trim();
    const city = departureCity.trim();
    const zip = departureZip.trim();
    const seats = Number(availableSeats) || DEFAULT_SEATS;

    if (!firstName || !city || !zip) {
      setMessage("Merci de renseigner le prénom, la ville et le code postal.");
      return;
    }

    const { error } = await supabase.from("carpool_cars").insert({
      driver_first_name: firstName,
      departure_city: city,
      departure_zip: zip,
      available_seats: seats,
    });

    if (error) {
      console.error("Erreur ajout voiture:", error);
      setMessage(`Voiture impossible à ajouter : ${error.message}`);
      return;
    }

    setDriverFirstName("");
    setDepartureCity("");
    setDepartureZip("");
    setAvailableSeats(DEFAULT_SEATS);
    setMessage("Voiture ajoutée au covoiturage.");
    await fetchCarpool();
  }

  async function joinCar(event, car) {
    event.preventDefault();
    setMessage("");

    const firstName = (passengerNames[car.id] || "").trim();
    const carPassengers = passengersByCar[car.id] || [];
    const remainingSeats = car.available_seats - carPassengers.length;

    if (!firstName) {
      setMessage("Merci de renseigner ton prénom pour rejoindre une voiture.");
      return;
    }

    if (remainingSeats <= 0) {
      setMessage("Cette voiture est déjà complète.");
      return;
    }

    const { error } = await supabase.from("carpool_passengers").insert({
      car_id: car.id,
      passenger_first_name: firstName,
    });

    if (error) {
      console.error("Erreur ajout passager:", error);
      setMessage(`Impossible de rejoindre cette voiture : ${error.message}`);
      return;
    }

    setPassengerNames((current) => ({ ...current, [car.id]: "" }));
    setMessage("Place réservée dans la voiture.");
    await fetchCarpool();
  }

  function unlockAdmin(event) {
    event.preventDefault();

    if (adminCode.trim() === ADMIN_CODE) {
      setAdminUnlocked(true);
      setAdminCode("");
      setMessage("");
    } else {
      setMessage("Code organisateur incorrect.");
    }
  }

  function startEdit(car) {
    setEditingCarId(car.id);
    setEditValues({
      driver_first_name: car.driver_first_name,
      departure_city: car.departure_city,
      departure_zip: car.departure_zip,
      available_seats: car.available_seats,
    });
  }

  async function saveEdit(carId) {
    const seats = Number(editValues.available_seats) || DEFAULT_SEATS;

    const { error } = await supabase
      .from("carpool_cars")
      .update({
        driver_first_name: editValues.driver_first_name?.trim(),
        departure_city: editValues.departure_city?.trim(),
        departure_zip: editValues.departure_zip?.trim(),
        available_seats: seats,
      })
      .eq("id", carId);

    if (error) {
      console.error("Erreur modification voiture:", error);
      setMessage(`Modification impossible : ${error.message}`);
      return;
    }

    setEditingCarId(null);
    setEditValues({});
    setMessage("Voiture modifiée.");
    await fetchCarpool();
  }

  async function deleteCar(carId) {
    if (!window.confirm("Supprimer cette voiture et ses passagers ?")) return;

    const { error: passengerError } = await supabase
      .from("carpool_passengers")
      .delete()
      .eq("car_id", carId);

    if (passengerError) {
      setMessage(`Suppression impossible : ${passengerError.message}`);
      return;
    }

    const { error } = await supabase.from("carpool_cars").delete().eq("id", carId);

    if (error) {
      setMessage(`Suppression impossible : ${error.message}`);
      return;
    }

    setMessage("Voiture supprimée.");
    await fetchCarpool();
  }

  async function deletePassenger(passengerId) {
    const { error } = await supabase.from("carpool_passengers").delete().eq("id", passengerId);

    if (error) {
      setMessage(`Suppression impossible : ${error.message}`);
      return;
    }

    setMessage("Affectation supprimée.");
    await fetchCarpool();
  }

  return (
    <section className="carpool-section" id="covoiturage">
      <div className="carpool-shell">
        <div className="carpool-hero">
          <div>
            <p className="eyebrow">Covoiturage</p>
            <h2>On optimise les voitures.</h2>
          </div>
          <p>
            Proposez une voiture avec votre ville de départ, ou ajoutez votre prénom
            à une voiture disponible. Seuls les prénoms apparaissent ; Dorian transmettra
            ensuite les numéros en direct pour faciliter l’organisation.
          </p>
        </div>

        <div className="carpool-grid">
          <aside className="carpool-panel">
            <h3>Je propose une voiture</h3>
            <p>Par défaut, on affiche 2 places disponibles. Ajuste si besoin.</p>

            <form className="carpool-form" onSubmit={addCar}>
              <label>
                Prénom du conducteur
                <input
                  value={driverFirstName}
                  onChange={(event) => setDriverFirstName(event.target.value)}
                  placeholder="Ex : Dorian"
                />
              </label>

              <div className="carpool-form-grid">
                <label>
                  Ville de départ
                  <input
                    value={departureCity}
                    onChange={(event) => setDepartureCity(event.target.value)}
                    placeholder="Ex : Paris"
                  />
                </label>

                <label>
                  Code postal
                  <input
                    value={departureZip}
                    onChange={(event) => setDepartureZip(event.target.value)}
                    placeholder="75015"
                  />
                </label>
              </div>

              <label>
                Places disponibles
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={availableSeats}
                  onChange={(event) => setAvailableSeats(event.target.value)}
                />
              </label>

              <button type="submit">Ajouter ma voiture</button>
            </form>

            {message && <p className="carpool-message">{message}</p>}
          </aside>

          <div className="carpool-list">
            {cars.length === 0 ? (
              <div className="carpool-empty">
                Aucune voiture proposée pour le moment. Le premier qui ajoute sa voiture
                devient officiellement responsable de la logistique routière.
              </div>
            ) : (
              cars.map((car) => {
                const carPassengers = passengersByCar[car.id] || [];
                const remainingSeats = car.available_seats - carPassengers.length;
                const isFull = remainingSeats <= 0;

                return (
                  <article className="carpool-card" key={car.id}>
                    <div className="carpool-card-top">
                      <div>
                        <p className="eyebrow small">Départ</p>
                        <h3>{car.departure_city} · {car.departure_zip}</h3>
                        <div className="carpool-route">
                          <span>→</span>
                          <strong>Voiture de {car.driver_first_name}</strong>
                        </div>
                      </div>
                      <div className={`seats-pill ${isFull ? "full" : ""}`}>
                        {isFull ? "Complet" : `${remainingSeats} place${remainingSeats > 1 ? "s" : ""} dispo`}
                      </div>
                    </div>

                    <div className="carpool-card-body">
                      <div>
                        <strong>Passagers inscrits</strong>
                        <div className="passengers-list">
                          {carPassengers.length === 0 ? (
                            <p className="passenger-empty">Encore personne dans cette voiture.</p>
                          ) : (
                            carPassengers.map((passenger) => (
                              <span className="passenger-chip" key={passenger.id}>
                                {passenger.passenger_first_name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {!isFull && (
                        <form className="passenger-form" onSubmit={(event) => joinCar(event, car)}>
                          <label>
                            Je veux rejoindre cette voiture
                            <div className="passenger-form-row">
                              <input
                                value={passengerNames[car.id] || ""}
                                onChange={(event) =>
                                  setPassengerNames((current) => ({
                                    ...current,
                                    [car.id]: event.target.value,
                                  }))
                                }
                                placeholder="Ton prénom"
                              />
                              <button type="submit">Je m’ajoute</button>
                            </div>
                          </label>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="carpool-admin-box">
          <h3>Gestion organisateur</h3>
          {!adminUnlocked ? (
            <form className="carpool-admin-form" onSubmit={unlockAdmin}>
              <input
                type="password"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="Code organisateur"
              />
              <button type="submit">Gérer le covoiturage</button>
            </form>
          ) : (
            <div className="carpool-admin-list">
              {cars.map((car) => {
                const carPassengers = passengersByCar[car.id] || [];
                const isEditing = editingCarId === car.id;

                return (
                  <div className="carpool-admin-item" key={car.id}>
                    {isEditing ? (
                      <div className="carpool-edit-grid">
                        <input
                          value={editValues.driver_first_name || ""}
                          onChange={(event) => setEditValues((current) => ({ ...current, driver_first_name: event.target.value }))}
                          placeholder="Conducteur"
                        />
                        <input
                          value={editValues.departure_city || ""}
                          onChange={(event) => setEditValues((current) => ({ ...current, departure_city: event.target.value }))}
                          placeholder="Ville"
                        />
                        <input
                          value={editValues.departure_zip || ""}
                          onChange={(event) => setEditValues((current) => ({ ...current, departure_zip: event.target.value }))}
                          placeholder="CP"
                        />
                        <input
                          type="number"
                          min="1"
                          max="8"
                          value={editValues.available_seats || DEFAULT_SEATS}
                          onChange={(event) => setEditValues((current) => ({ ...current, available_seats: event.target.value }))}
                          placeholder="Places"
                        />
                      </div>
                    ) : (
                      <div>
                        <strong>{car.driver_first_name} · {car.departure_city} {car.departure_zip}</strong>
                        <span>
                          {car.available_seats} places · Passagers : {carPassengers.length ? carPassengers.map((p) => p.passenger_first_name).join(", ") : "aucun"}
                        </span>
                      </div>
                    )}

                    <div className="carpool-admin-actions">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => saveEdit(car.id)}>Enregistrer</button>
                          <button type="button" className="secondary" onClick={() => setEditingCarId(null)}>Annuler</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="secondary" onClick={() => startEdit(car)}>Modifier la voiture</button>
                          <button type="button" className="danger" onClick={() => deleteCar(car.id)}>Supprimer la voiture</button>
                        </>
                      )}

                      {carPassengers.map((passenger) => (
                        <button
                          type="button"
                          className="danger"
                          key={passenger.id}
                          onClick={() => deletePassenger(passenger.id)}
                        >
                          Retirer {passenger.passenger_first_name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function initCarpoolModule() {
  function addNavLink() {
    const nav = document.querySelector(".header nav");
    if (!nav || nav.querySelector('a[href="#covoiturage"]')) return;

    const mapLink = nav.querySelector('a[href="#carte"]');
    const link = document.createElement("a");
    link.href = "#covoiturage";
    link.textContent = "Covoiturage";

    if (mapLink) {
      mapLink.insertAdjacentElement("afterend", link);
    } else {
      nav.appendChild(link);
    }
  }

  function mount() {
    addNavLink();

    if (document.querySelector("#covoiturage") || document.querySelector(".carpool-mount")) return true;

    const main = document.querySelector("main");
    if (!main) return false;

    const shell = document.createElement("div");
    shell.className = "carpool-mount";
    main.appendChild(shell);
    createRoot(shell).render(<CarpoolModule />);
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const mounted = mount();
    if (mounted || attempts >= 120) {
      window.clearInterval(timer);
    }
  }, 250);

  window.addEventListener("load", mount, { once: true });
}
