export type CompanyOfficeAddress = {
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string;
  type: "company_office" | "registered_office";
  sourceUrl: string;
  verifiedAt: string | null;
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

export function companyOfficeAddressFromMetadata(metadata: Record<string, unknown> | null | undefined): CompanyOfficeAddress | null {
  if (!metadata) return null;

  const address = text(metadata.company_office_address);
  const countryCode = text(metadata.company_office_country_code)?.toUpperCase();
  const scope = text(metadata.company_office_address_scope)?.toLowerCase();
  const sourceUrl = text(metadata.company_office_address_source_url);
  const rawType = text(metadata.company_office_address_type);

  if (!address || countryCode !== "ES" || scope !== "spain" || !sourceUrl?.startsWith("https://")) return null;
  if (rawType !== "company_office" && rawType !== "registered_office") return null;

  return {
    address,
    city: text(metadata.company_office_city),
    postalCode: text(metadata.company_office_postal_code),
    country: text(metadata.company_office_country) ?? "España",
    type: rawType,
    sourceUrl,
    verifiedAt: text(metadata.company_office_address_verified_at),
  };
}
