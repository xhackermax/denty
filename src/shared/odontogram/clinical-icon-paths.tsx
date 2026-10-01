import type { ClinicalIconFamily } from "@/domain";

// Original Denty outlines: one viewBox, rounded strokes, no third-party image assets.
const TOOTH =
  "M6 3.5C3 4 3 8 4.5 12L6.5 20C7 22 8.5 21 9 19L11 14C11.4 13 12.6 13 13 14L15 19C15.5 21 17 22 17.5 20L19.5 12C21 8 21 4 18 3.5C15.5 3 14.5 4.5 12 4.5S8.5 3 6 3.5Z";
const CROWN = "M5 14L3.5 8C2.5 4 5 2.5 8 3.5Q12 5 16 3.5C19 2.5 21.5 4 20.5 8L19 14Z";

export function ClinicalIconPaths({
  family,
  post = false,
}: {
  family: ClinicalIconFamily;
  post?: boolean;
}) {
  switch (family) {
    case "extraction":
      return (
        <>
          <path d={TOOTH} />
          <path className="clinical-accent" d="M8 7L16 15M16 7L8 15" />
        </>
      );
    case "surgery":
      return (
        <>
          <path className="clinical-accent" d="M7 3L11 10L8 15M17 3L13 10L16 15M11 10L13 10" />
          <path d="M8 15C5 13 2 17 4 20C6 23 10 20 8 15ZM16 15C19 13 22 17 20 20C18 23 14 20 16 15Z" />
        </>
      );
    case "endodontics":
      return (
        <>
          <path d={TOOTH} />
          <path
            className="clinical-accent"
            d={post ? "M10 7H14V17H10ZM8 7H16" : "M8 8Q12 11 16 8M12 10V13M12 13L8 19M12 13L16 19"}
          />
        </>
      );
    case "implantology":
      return (
        <>
          <path d="M6 9L4.5 5C4 2.5 7 2 9 3Q12 4 15 3C17 2 20 2.5 19.5 5L18 9ZM8 9V12H16V9" />
          <path
            className="clinical-accent"
            d="M9 12L10 21H14L15 12M8 14L16 15M8.5 17L15.5 18M9 20L15 21"
          />
        </>
      );
    case "crown":
      return (
        <>
          <path d={CROWN} />
          <path className="clinical-accent" d="M5 14V18Q12 21 19 18V14" />
          <path d="M6 6Q6 5 8 5" />
        </>
      );
    case "fixed_prosthesis":
      return (
        <>
          <path d="M2 9Q2 5 5 6Q8 5 8 9V15H2ZM8 9Q8 5 12 6Q16 5 16 9V15H8ZM16 9Q16 5 19 6Q22 5 22 9V15H16Z" />
          <path className="clinical-accent" d="M2 18H22" />
        </>
      );
    case "removable_prosthesis":
      return (
        <>
          <path d="M8 5Q6 5 7 10L8 17Q9 21 10 17L12 13L14 17Q15 21 16 17L17 10Q18 5 16 5Q12 7 8 5Z" />
          <path
            className="clinical-accent"
            d="M7 9H4Q2 9 2 12Q2 15 5 15M17 9H20Q22 9 22 12Q22 15 19 15"
          />
        </>
      );
    case "complete_denture":
      return (
        <>
          <path d="M3 7Q12 3 21 7V14Q12 21 3 14ZM3 11Q12 17 21 11M7 6V13M12 5V14M17 6V13" />
          <path className="clinical-accent" d="M5 18Q12 22 19 18" />
        </>
      );
    case "occlusal_splint":
      return (
        <>
          <path d="M4 5C1 11 4 21 12 21S23 11 20 5L17 7C19 12 17 17 12 17S5 12 7 7ZM7 7Q12 10 17 7" />
          <path d="M7 12L4 13M12 17V21M17 12L20 13" />
        </>
      );
    case "orthodontics":
      return (
        <>
          <path d="M3 6Q7 4 10 6V18Q7 20 3 18ZM14 6Q17 4 21 6V18Q17 20 14 18Z" />
          <rect x="5" y="9" width="3" height="6" rx="1" />
          <rect x="16" y="9" width="3" height="6" rx="1" />
          <path className="clinical-accent" d="M1 12H23" />
        </>
      );
    case "periodontal_hygiene":
      return (
        <>
          <path d="M5 3H11V9H5ZM5 5H11M5 7H11M8 9V19Q8 21 10 21Q12 21 12 19V15" />
          <path className="clinical-accent" d="M17 4V10M14 7H20M17 15V19M15 17H19" />
        </>
      );
    case "sealant":
      return (
        <>
          <path d={TOOTH} />
          <path className="clinical-accent" d="M8 8Q12 11 16 8M10 9V11H14V9" />
        </>
      );
    case "indirect_restoration":
      return (
        <>
          <path d={TOOTH} />
          <path className="clinical-accent" d="M6 6Q12 9 18 6L16 11Q12 13 8 11Z" />
        </>
      );
    case "whitening":
      return (
        <>
          <path d="M5 6C2 7 4 14 6 20Q7 22 8 18L10 14L12 18Q13 22 14 20L17 10M5 6Q9 8 12 6" />
          <path className="clinical-accent" d="M18 2L19 5L22 6L19 7L18 10L17 7L14 6L17 5Z" />
        </>
      );
    case "imaging":
      return (
        <>
          <rect x="3" y="2" width="18" height="20" rx="3" />
          <path
            className="clinical-accent"
            d="M8 7Q6 8 8 12L9 17Q10 19 11 15L12 12L13 15Q14 19 15 17L16 12Q18 8 16 7Q12 9 8 7Z"
          />
        </>
      );
    case "diagnostic":
      return (
        <>
          <path d="M5 5C2 6 3 12 5 19Q6 21 7 18L9 14L11 18Q12 21 13 19M5 5Q8 7 10 5" />
          <circle cx="16" cy="8" r="5" />
          <path className="clinical-accent" d="M19.5 11.5L23 15" />
        </>
      );
    case "review":
      return (
        <>
          <path d={TOOTH} />
          <path className="clinical-accent" d="M7 10L10 13L17 7" />
        </>
      );
    case "emergency":
      return (
        <>
          <path d="M5 5C2 6 3 12 5 19Q6 21 7 18L9 14L11 18Q12 21 13 19M5 5Q8 7 10 5" />
          <path className="clinical-accent" d="M17 3L23 14H11ZM17 7V10M17 12V12.2" />
        </>
      );
    case "restorative_surface":
      return <path d={TOOTH} />;
  }
}
