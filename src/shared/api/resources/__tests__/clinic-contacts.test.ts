import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClinicContactsAPI } from "../clinic-contacts";

describe("clinic-contacts API", () => {
  let mockClient: { rpc: ReturnType<typeof vi.fn>; from: ReturnType<typeof vi.fn> };
  let api: ReturnType<typeof createClinicContactsAPI>;

  beforeEach(() => {
    mockClient = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
    api = createClinicContactsAPI(
      mockClient as unknown as Parameters<typeof createClinicContactsAPI>[0],
    );
  });

  describe("create", () => {
    it("should create a contact with all fields", async () => {
      const mockContact = {
        id: "contact-1",
        clinic_id: "clinic-1",
        name: "Plumber Juan",
        category: "Plumber",
        phones: [{ number: "555-1234", type: "mobile" }],
        emails: ["plumber@example.com"],
        notes: "Available weekdays",
        hours: "9:00-17:00",
        created_by: "user-1",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        version: 1,
      };

      mockClient.rpc.mockResolvedValue({ data: mockContact, error: null });

      const result = await api.create("clinic-1", {
        name: "Plumber Juan",
        category: "Plumber",
        phones: [{ number: "555-1234", type: "mobile" }],
        emails: ["plumber@example.com"],
        notes: "Available weekdays",
        hours: "9:00-17:00",
      });

      expect(result).toEqual(mockContact);
      expect(mockClient.rpc).toHaveBeenCalledWith("create_clinic_contact", {
        p_clinic_id: "clinic-1",
        p_name: "Plumber Juan",
        p_category: "Plumber",
        p_phones: [{ number: "555-1234", type: "mobile" }],
        p_emails: ["plumber@example.com"],
        p_notes: "Available weekdays",
        p_hours: "9:00-17:00",
      });
    });

    it("should handle missing optional fields", async () => {
      const mockContact = {
        id: "contact-1",
        clinic_id: "clinic-1",
        name: "Plumber Juan",
        category: "Plumber",
        phones: [],
        emails: [],
        notes: null,
        hours: null,
        created_by: "user-1",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        version: 1,
      };

      mockClient.rpc.mockResolvedValue({ data: mockContact, error: null });

      const result = await api.create("clinic-1", {
        name: "Plumber Juan",
        category: "Plumber",
      });

      expect(result.phones).toEqual([]);
      expect(mockClient.rpc).toHaveBeenCalledWith("create_clinic_contact", {
        p_clinic_id: "clinic-1",
        p_name: "Plumber Juan",
        p_category: "Plumber",
        p_phones: null,
        p_emails: null,
        p_notes: null,
        p_hours: null,
      });
    });

    it("should throw on error", async () => {
      const error = new Error("Database error");
      mockClient.rpc.mockResolvedValue({ data: null, error });

      await expect(
        api.create("clinic-1", {
          name: "Test",
          category: "Test",
        }),
      ).rejects.toThrow("Database error");
    });
  });

  describe("list", () => {
    it("should list contacts with pagination", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          clinic_id: "clinic-1",
          name: "Plumber",
          category: "Plumber",
          phones: [],
          emails: [],
          notes: null,
          hours: null,
          created_by: "user-1",
          created_at: "2026-10-01T00:00:00Z",
          updated_at: "2026-10-01T00:00:00Z",
          version: 1,
          total_count: 1,
        },
      ];

      mockClient.rpc.mockResolvedValue({ data: mockContacts, error: null });

      const result = await api.list("clinic-1", { limit: 10, offset: 0 });

      expect(result.data.length).toBe(1);
      expect(result.totalCount).toBe(1);
    });

    it("should support search parameter", async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      await api.list("clinic-1", { search: "plumber" });

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "list_clinic_contacts",
        expect.objectContaining({
          p_search: "plumber",
        }),
      );
    });

    it("should support category filter", async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      await api.list("clinic-1", { category: "Plumber" });

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "list_clinic_contacts",
        expect.objectContaining({
          p_category: "Plumber",
        }),
      );
    });
  });

  describe("update", () => {
    it("should update a contact", async () => {
      const mockContact = {
        id: "contact-1",
        clinic_id: "clinic-1",
        name: "Plumber Juan Updated",
        category: "Plumber",
        phones: [{ number: "555-9999", type: "mobile" }],
        emails: [],
        notes: null,
        hours: null,
        created_by: "user-1",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        version: 2,
      };

      mockClient.rpc.mockResolvedValue({ data: mockContact, error: null });

      const result = await api.update("contact-1", {
        name: "Plumber Juan Updated",
        phones: [{ number: "555-9999", type: "mobile" }],
        expectedVersion: 1,
      });

      expect(result.name).toBe("Plumber Juan Updated");
      expect(result.version).toBe(2);
    });

    it("should handle version conflicts", async () => {
      const error = new Error("VERSION_CONFLICT");
      mockClient.rpc.mockResolvedValue({ data: null, error });

      await expect(api.update("contact-1", { name: "Test", expectedVersion: 1 })).rejects.toThrow(
        "VERSION_CONFLICT",
      );
    });
  });

  describe("delete", () => {
    it("should delete a contact", async () => {
      mockClient.rpc.mockResolvedValue({ data: true, error: null });

      await api.delete("contact-1");

      expect(mockClient.rpc).toHaveBeenCalledWith("delete_clinic_contact", {
        p_contact_id: "contact-1",
      });
    });

    it("should throw on error", async () => {
      const error = new Error("Not found");
      mockClient.rpc.mockResolvedValue({ data: null, error });

      await expect(api.delete("invalid-id")).rejects.toThrow("Not found");
    });
  });

  describe("listCategories", () => {
    it("should list unique categories", async () => {
      mockClient.rpc.mockResolvedValue({
        data: [
          { category: "Plumber" },
          { category: "Electrician" },
          { category: "Delivery" },
          { category: "Plumber" },
        ],
        error: null,
      });

      const result = await api.listCategories("clinic-1");

      expect(result).toEqual(["Plumber", "Electrician", "Delivery"]);
    });

    it("should return empty array if no categories", async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await api.listCategories("clinic-1");

      expect(result).toEqual([]);
    });
  });
});
