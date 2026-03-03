"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, LogOut, Ticket as TicketIcon, Search, AlertCircle } from "lucide-react";
import Link from "next/link";
import NotificationsDropdown from "@/components/notifications-dropdown";

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigned_to?: string;
  categories?: string;
  category_colors?: string;
  created_at: string;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchTickets();
    }
  }, [status, router, searchQuery]);

  const fetchTickets = async () => {
    try {
      const url = searchQuery ? `/api/tickets?search=${encodeURIComponent(searchQuery)}` : "/api/tickets";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tickets");
      }
      const data = await res.json();
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <TicketIcon className="h-6 w-6 text-indigo-600 mr-2" />
              <span className="text-xl font-semibold text-zinc-900 tracking-tight">Galea Tickets</span>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsDropdown />
              <span className="text-sm text-zinc-500 hidden sm:block">Logged in as {session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-1.5 border border-zinc-200 text-sm font-medium rounded-lg text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tickets</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage your Galea-cluster support tickets</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow"
              />
            </div>
            <Link
              href="/tickets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Ticket
            </Link>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800">Connection Error</h3>
            <p className="text-sm text-red-600 mt-2 max-w-md">{error}</p>
            <p className="text-xs text-red-500 mt-4">Make sure DATABASE_URL is configured correctly in your environment.</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-zinc-100 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900">No tickets found</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6">Get started by creating a new support ticket.</p>
            <Link
              href="/tickets/new"
              className="inline-flex items-center px-4 py-2 border border-zinc-200 text-sm font-medium rounded-xl text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-zinc-200">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link href={`/tickets/${ticket.id}`} className="block hover:bg-zinc-50 transition-colors">
                    <div className="px-6 py-5 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">{ticket.title}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ticket.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                              ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' :
                              'bg-zinc-100 text-zinc-800'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-zinc-500">
                            <p className="truncate max-w-md">{ticket.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {ticket.categories && ticket.categories.split(',').map((cat, i) => {
                            const colors = ticket.category_colors ? ticket.category_colors.split(',') : [];
                            const color = colors[i] || '#4F46E5';
                            return (
                              <span key={i} className="px-2 py-0.5 inline-flex text-xs font-medium rounded-md border" style={{ borderColor: color, color: color, backgroundColor: `${color}10` }}>
                                {cat}
                              </span>
                            );
                          })}
                          {ticket.assigned_to && (
                            <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                              Assigned: {ticket.assigned_to}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-zinc-400">
                          Created on {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
