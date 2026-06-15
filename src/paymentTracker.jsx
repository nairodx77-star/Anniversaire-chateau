import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "./paymentTracker.css";

const ADMIN_CODE = "1977";

function PaymentTracker() {
  const [payments, setPayments] = useState([]);
  const [paymentCode, setPaymentCode] = useState("");
  const [paymentAdminUnlocked, setPaymentAdminUnlocked] = useState(false);
  const [paymentFirstName, setPaymentFirstName] = useState("");
  const [paymentLastName, setPaymentLastName] = useState("");
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  async function fetchPayments() {
    if (!isSupabaseConfigured || !supabase) {
      setPaymentMessage("Supabase n’est pas configuré : suivi des paiements indisponible.");
      return;
    }

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Erreur chargement paiements:", error);
      setPaymentMessage("Impossible de charger le suivi des paiements.");
      return;
    }

    setPayments(data || []);
  }

  useEffect(() => {
    fetchPayments();

    if (!isSupabaseConfigured || !supabase) return undefined;

    const channel = supabase
      .channel("payments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function unlockPaymentAdmin(event) {
    event.preventDefault();

    if (paymentCode.trim() === ADMIN_CODE) {
      setPaymentAdminUnlocked(true);
      setPaymentCode("");
      setPaymentMessage("");
    } else {
      setPaymentMessage("Code organisateur incorrect.");
    }
  }

  function formatPaymentName(person) {
    const firstName = person.first_name?.trim() || "";
    const lastInitial = person.last_name?.trim()?.charAt(0)?.toUpperCase() || "";
    return `${firstName} ${lastInitial}.`;
  }

  async function addPayment(event) {
    event.preventDefault();

    const firstName = paymentFirstName.trim();
    const lastName = paymentLastName.trim();

    if (!firstName || !lastName) {
      setPaymentMessage("Merci de renseigner le prénom et le nom.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setPaymentMessage("Supabase n’est pas configuré.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      first_name: firstName,
      last_name: lastName,
      paid: paymentPaid,
    });

    if (error) {
      console.error("Erreur ajout paiement:", error);
      setPaymentMessage(`Ajout impossible : ${error.message}`);
      return;
    }

    setPaymentFirstName("");
    setPaymentLastName("");
    setPaymentPaid(false);
    setPaymentMessage("Participation ajoutée.");
    await fetchPayments();
  }

  async function togglePayment(person) {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from("payments")
      .update({ paid: !person.paid })
      .eq("id", person.id);

    if (error) {
      console.error("Erreur modification paiement:", error);
      setPaymentMessage(`Modification impossible : ${error.message}`);
      return;
    }

    await fetchPayments();
  }

  async function deletePayment(id) {
    if (!window.confirm("Supprimer cette personne du suivi des paiements ?")) return;
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (error) {
      console.error("Erreur suppression paiement:", error);
      setPaymentMessage(`Suppression impossible : ${error.message}`);
      return;
    }

    setPaymentMessage("Ligne supprimée.");
    await fetchPayments();
  }

  return (
    <div className="payment-tracker">
      <div className="payment-header">
        <p className="eyebrow">Suivi des participations</p>
        <h3>Paiement de la participation logement</h3>
        <p>
          Suivi indicatif des participations reçues. Les noms sont affichés de
          manière abrégée.
        </p>
      </div>

      <div className="payment-list">
        {payments.length === 0 ? (
          <p className="payment-empty">Aucune participation enregistrée pour le moment.</p>
        ) : (
          payments.map((person) => (
            <div
              key={person.id}
              className={`payment-row ${person.paid ? "is-paid" : "is-pending"}`}
            >
              <span className="payment-name">{formatPaymentName(person)}</span>
              <span className="payment-status">
                {person.paid ? "Payé" : "En attente de paiement"}
              </span>

              {paymentAdminUnlocked && (
                <div className="payment-actions">
                  <button type="button" onClick={() => togglePayment(person)}>
                    {person.paid ? "Marquer en attente" : "Marquer payé"}
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => deletePayment(person.id)}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {paymentMessage && <p className="payment-message">{paymentMessage}</p>}

      {!paymentAdminUnlocked ? (
        <form className="payment-admin-form" onSubmit={unlockPaymentAdmin}>
          <input
            type="password"
            value={paymentCode}
            onChange={(event) => setPaymentCode(event.target.value)}
            placeholder="Code organisateur"
          />
          <button type="submit">Gérer les paiements</button>
        </form>
      ) : (
        <form className="payment-form" onSubmit={addPayment}>
          <h4>Ajouter ou suivre une participation</h4>

          <div className="payment-form-grid">
            <input
              type="text"
              value={paymentFirstName}
              onChange={(event) => setPaymentFirstName(event.target.value)}
              placeholder="Prénom"
            />

            <input
              type="text"
              value={paymentLastName}
              onChange={(event) => setPaymentLastName(event.target.value)}
              placeholder="Nom"
            />

            <label className="paid-checkbox">
              <input
                type="checkbox"
                checked={paymentPaid}
                onChange={(event) => setPaymentPaid(event.target.checked)}
              />
              Payé
            </label>
          </div>

          <button type="submit">Ajouter</button>
        </form>
      )}
    </div>
  );
}

function tuneFeesBox() {
  const feesBox = document.querySelector(".fees-box");
  if (!feesBox) return false;

  const feeParagraph = feesBox.querySelector("p:not(.eyebrow)");
  if (feeParagraph) {
    feeParagraph.innerHTML = feeParagraph.innerHTML
      .replace("on s’en occupe", "c’est pour nous ;)")
      .replace("on s'en occupe", "c’est pour nous ;)");
  }

  const links = Array.from(feesBox.querySelectorAll(".fees-actions a"));
  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const label = link.textContent || "";

    if (href.includes("weropay") || label.toLowerCase().includes("wero")) {
      link.remove();
      return;
    }

    if (href.includes("revolut") || label.toLowerCase().includes("revolut")) {
      link.textContent = "Payer en ligne";
    }
  });

  return true;
}

export function initPaymentTracker() {
  function mount() {
    const feesBox = document.querySelector(".fees-box");
    if (!feesBox) return false;

    tuneFeesBox();

    if (document.querySelector(".payment-tracker-shell")) return true;

    const shell = document.createElement("div");
    shell.className = "payment-tracker-shell";
    shell.setAttribute("data-payment-tracker", "true");
    feesBox.insertAdjacentElement("afterend", shell);
    createRoot(shell).render(<PaymentTracker />);
    return true;
  }

  function tryMountRepeatedly() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const mounted = mount();
      if (mounted || attempts >= 60) {
        window.clearInterval(timer);
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryMountRepeatedly, { once: true });
  } else {
    window.requestAnimationFrame(tryMountRepeatedly);
  }

  window.addEventListener("load", mount, { once: true });
}
