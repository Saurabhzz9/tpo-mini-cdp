"use client";
import { PersonTable } from "@/components/subscribers/person-table";
import { Card, Header, Loading } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import type { Person } from "@/lib/audience";
import { fmt } from "@/lib/format";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
export default function SubscribersScreen() {
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error } = useData<{
    people: Person[];
    total: number;
    page: number;
  }>(
    `people?q=${encodeURIComponent(search)}&filter=${filter}&page=${page}`,
    15000,
  );
  return (
    <>
      <Header
        eyebrow="THE PEOPLE BEHIND THE NUMBERS"
        title="Every reader has a story."
        description="Explore connected profiles across your newsletter, website, and app."
      />
      <Card>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search readers"
              placeholder="Search email, source, visitor or app user ID…"
            />
          </div>
          <select
            aria-label="Filter readers"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All readers</option>
            <option value="duplicates">Duplicate identities</option>
            <option value="app-only">Standalone app users</option>
            <option value="inactive">Inactive or never opened</option>
          </select>
        </div>
        {data ? (
          <>
            <div className="table-context">
              {fmt(data.total)} profiles{" "}
              <span>
                · Canonical identities, with original records preserved
              </span>
            </div>
            <PersonTable people={data.people} />
            <div className="pagination">
              <span>
                Page {page} of {Math.max(1, Math.ceil(data.total / 25))}
              </span>
              <button
                className="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <button
                className="button"
                disabled={page * 25 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <Loading error={error} />
        )}
      </Card>
    </>
  );
}
