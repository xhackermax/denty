"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClinicContact } from "@/shared/api/resources/clinic-contacts";
import { useClinicContacts } from "./use-clinic-contacts";

interface ClinicContactsListProps {
  clinicId: string;
  initialContacts: ClinicContact[];
  initialTotalCount: number;
}

export function ClinicContactsList({
  clinicId,
  initialContacts,
  initialTotalCount,
}: ClinicContactsListProps) {
  const { create, list, update, delete: deleteContact, isLoading: apiLoading } = useClinicContacts(clinicId);
  const [contacts, setContacts] = useState(initialContacts);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ClinicContact | null>(
    null
  );
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const categories = useMemo(
    () => [...new Set(contacts.map((c) => c.category))],
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        !search ||
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.notes?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !selectedCategory || contact.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [contacts, search, selectedCategory]);

  const handleLoadContacts = async () => {
    try {
      const options: any = { limit: 100, offset: 0 };
      if (search) options.search = search;
      if (selectedCategory) options.category = selectedCategory;

      const result = await list(options);
      setContacts(result.data);
      setTotalCount(result.totalCount);
    } catch (error) {
      setToast({ type: "error", message: "Error loading contacts" });
      console.error(error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact(contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
      setToast({ type: "success", message: "Contact deleted" });
    } catch (error) {
      setToast({ type: "error", message: "Error deleting contact" });
      console.error(error);
    }
  };

  const handleEdit = (contact: ClinicContact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const formatPhones = (phones: any[]) => {
    if (!phones || phones.length === 0) return null;
    return phones.map((p) => (typeof p === "string" ? p : p.number)).join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contactos especiales</h2>
        <button
          onClick={() => {
            setEditingContact(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          ➕ Nuevo contacto
        </button>
      </div>

      {showForm && (
        <ClinicContactForm
          clinicId={clinicId}
          editingContact={editingContact}
          onSuccess={(contact) => {
            setShowForm(false);
            if (editingContact) {
              setContacts(
                contacts.map((c) => (c.id === contact.id ? contact : c))
              );
            } else {
              setContacts([contact, ...contacts]);
              setTotalCount(totalCount + 1);
            }
            setToast({
              type: "success",
              message: editingContact ? "Contact updated" : "Contact created",
            });
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingContact(null);
          }}
          onCreate={(clinicId, data) => create(data)}
          onUpdate={(contactId, data) => {
            const { expectedVersion, ...rest } = data;
            return update(contactId, { ...rest, expectedVersion });
          }}
        />
      )}

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredContacts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No contacts found</p>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="border rounded-lg p-4 bg-white hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{contact.name}</h3>
                  <p className="text-sm text-gray-600">{contact.category}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 text-xl"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-red-600 text-xl"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {formatPhones(contact.phones) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📞</span>
                    <a href={`tel:${formatPhones(contact.phones)}`}>
                      {formatPhones(contact.phones)}
                    </a>
                  </div>
                )}
                {contact.emails && contact.emails.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📧</span>
                    <a href={`mailto:${contact.emails.join(", ")}`}>
                      {Array.isArray(contact.emails)
                        ? contact.emails.join(", ")
                        : contact.emails}
                    </a>
                  </div>
                )}
                {contact.hours && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>⏰</span>
                    <span>{contact.hours}</span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <p className="text-sm text-gray-600 mt-3">{contact.notes}</p>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-sm text-gray-500 text-center">
        Total: {totalCount} contacts
      </p>
    </div>
  );
}

interface ClinicContactFormProps {
  clinicId: string;
  editingContact: ClinicContact | null;
  onSuccess: (contact: ClinicContact) => void;
  onCancel: () => void;
  onCreate: (clinicId: string, data: any) => Promise<ClinicContact>;
  onUpdate: (contactId: string, data: any) => Promise<ClinicContact>;
}

function ClinicContactForm({
  clinicId,
  editingContact,
  onSuccess,
  onCancel,
  onCreate,
  onUpdate,
}: ClinicContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingContact?.name || "",
    category: editingContact?.category || "",
    phones: (editingContact?.phones || []) as Array<{ number: string; type?: string }>,
    emails: (editingContact?.emails || []) as string[],
    notes: editingContact?.notes || "",
    hours: editingContact?.hours || "",
  });
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;

      if (editingContact) {
        result = await onUpdate(editingContact.id, {
          ...formData,
          expectedVersion: editingContact.version,
        });
      } else {
        result = await onCreate(clinicId, formData);
      }

      onSuccess(result);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error saving contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">
        {editingContact ? "Edit contact" : "New contact"}
      </h3>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Plumber Juan"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <input
            type="text"
            required
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Plumber, Electrician, Delivery"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phones</label>
          <div className="flex gap-2 mb-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Add phone number"
            />
            <button
              type="button"
              onClick={() => {
                if (newPhone) {
                  setFormData({
                    ...formData,
                    phones: [
                      ...(Array.isArray(formData.phones)
                        ? formData.phones
                        : []),
                      { number: newPhone, type: "mobile" },
                    ],
                  });
                  setNewPhone("");
                }
              }}
              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {Array.isArray(formData.phones) &&
              formData.phones.map((phone, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">
                    {typeof phone === "string" ? phone : phone.number}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        phones: formData.phones.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Emails</label>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Add email"
            />
            <button
              type="button"
              onClick={() => {
                if (newEmail) {
                  setFormData({
                    ...formData,
                    emails: [
                      ...(Array.isArray(formData.emails)
                        ? formData.emails
                        : []),
                      newEmail,
                    ],
                  });
                  setNewEmail("");
                }
              }}
              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {Array.isArray(formData.emails) &&
              formData.emails.map((email, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        emails: formData.emails.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hours</label>
          <input
            type="text"
            value={formData.hours}
            onChange={(e) =>
              setFormData({ ...formData, hours: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., 9:00-17:00 (Mon-Fri)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading
            ? "Saving..."
            : editingContact
              ? "Update"
              : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border rounded-lg py-2 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
