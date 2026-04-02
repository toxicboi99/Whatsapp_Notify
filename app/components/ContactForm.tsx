"use client";

import { useEffect, useState } from "react";

interface FormData {
  name: string;
  phone: string;
}

interface FormState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

interface WhatsAppStatus {
  ready: boolean;
  status: string;
  message: string;
}

function getStatusCopy(status: WhatsAppStatus) {
  if (status.ready) {
    return {
      tone: "ready",
      label: "Connected",
      detail: "WhatsApp is ready to send confirmations right away.",
    };
  }

  if (status.status === "qr") {
    return {
      tone: "pending",
      label: "Scan Required",
      detail: "Open the server terminal and scan the QR code from WhatsApp.",
    };
  }

  if (status.status === "authenticated") {
    return {
      tone: "pending",
      label: "Authenticated",
      detail: "The account is linked. Waiting for the final ready signal.",
    };
  }

  if (status.status === "error" || status.status === "auth_failure") {
    return {
      tone: "error",
      label: "Needs Attention",
      detail: "The WhatsApp session needs a quick reconnect from the terminal.",
    };
  }

  return {
    tone: "pending",
    label: "Starting",
    detail: "The WhatsApp client is warming up. This usually takes a minute or two.",
  };
}

const initialStatus: WhatsAppStatus = {
  ready: false,
  status: "starting",
  message: "Checking WhatsApp connection...",
};

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
  });

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null,
  });

  const [whatsAppStatus, setWhatsAppStatus] =
    useState<WhatsAppStatus>(initialStatus);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/send-whatsapp", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch WhatsApp status");
        }

        const data = (await response.json()) as WhatsAppStatus;

        if (!cancelled) {
          setWhatsAppStatus(data);
        }
      } catch {
        if (!cancelled) {
          setWhatsAppStatus({
            ready: false,
            status: "error",
            message: "Unable to verify the current WhatsApp connection.",
          });
        }
      }
    };

    void loadStatus();

    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formState.error) {
      setFormState((prev) => ({
        ...prev,
        error: null,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setFormState({
      loading: true,
      success: false,
      error: null,
    });

    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState({
          loading: false,
          success: false,
          error: data.error || "Failed to submit form",
        });
        return;
      }

      setFormState({
        loading: false,
        success: true,
        error: null,
      });

      setFormData({
        name: "",
        phone: "",
      });

      setTimeout(() => {
        setFormState({
          loading: false,
          success: false,
          error: null,
        });
      }, 5000);
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const statusCopy = getStatusCopy(whatsAppStatus);
  const submitDisabled = formState.loading || !whatsAppStatus.ready;

  return (
    <section className="contact-panel glass-panel" aria-labelledby="contact-form-title">
      <div className="panel-topline">
        <span className={`status-chip ${statusCopy.tone}`}>
          <span className="signal-dot" aria-hidden="true" />
          {statusCopy.label}
        </span>
        <p className="panel-caption">Live WhatsApp session status</p>
      </div>

      <div className="panel-header">
        <h2 id="contact-form-title" className="panel-title">
          Start a stylish contact experience
        </h2>
        <p className="panel-description">
          Fill in the details below and the visitor receives a WhatsApp
          confirmation message from your authenticated account.
        </p>
      </div>

      <div className={`status-banner ${statusCopy.tone}`}>
        <strong>{statusCopy.label}</strong>
        <span>{statusCopy.detail}</span>
      </div>

      {formState.success && (
        <div className="status-banner ready" role="status" aria-live="polite">
          <strong>Success</strong>
          <span>Form submitted successfully. The WhatsApp confirmation was sent.</span>
        </div>
      )}

      {formState.error && (
        <div className="status-banner error" role="alert">
          <strong>Unable to send</strong>
          <span>{formState.error}</span>
        </div>
      )}

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input
            className="field-input"
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Ritesh Shah"
            disabled={formState.loading}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="phone">
            WhatsApp number
          </label>
          <input
            className="field-input"
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+91 98765 43210"
            disabled={formState.loading}
            required
          />
          <p className="field-help">
            Supported formats: India +91 with 10 digits, or Nepal +977 with 9
            to 10 digits.
          </p>
        </div>

        <button className="submit-button" type="submit" disabled={submitDisabled}>
          {formState.loading
            ? "Sending Confirmation..."
            : whatsAppStatus.ready
              ? "Send WhatsApp Confirmation"
              : "Waiting for WhatsApp Connection"}
        </button>

        <div className="form-footnote">
          <p>{whatsAppStatus.message}</p>
          <p>You will send: "You Successfully submitted form"</p>
        </div>
      </form>
    </section>
  );
}
