import { type PaginationItem } from "../../utils/pagination";

type PaginationPageButtonsProps = {
  items: PaginationItem[];
  currentPage: number;
  onPageChange: (page: number) => void;
  getButtonClassName: (page: number) => string;
  ellipsisClassName?: string;
};

export default function PaginationPageButtons({
  items,
  currentPage,
  onPageChange,
  getButtonClassName,
  ellipsisClassName = "flex h-[30px] min-w-[30px] items-center justify-center px-2 text-[13px] text-ink-muted",
}: PaginationPageButtonsProps) {
  return (
    <>
      {items.map((item, index) =>
        item === "..." ? (
          <span key={`ellipsis-${index}`} className={ellipsisClassName}>
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={getButtonClassName(item)}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}
    </>
  );
}
