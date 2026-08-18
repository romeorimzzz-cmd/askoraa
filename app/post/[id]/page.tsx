"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Post = {
  id: string;
  author_id: string;
  kind: "ASK" | "HELP";
  title: string;
  body: string;
  category: string;
  status: string;
  created_at: string;
  profiles?: {
  display_name: string;
}[] | null;
};

type RequestRow = {
  id: string;
  requester_id: string;
  owner_id: string;
  status: string;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
};

type Room = {
  id: string;
  post_id: string;
  problem_owner_id: string;
  solver_id: string;
  status: string;
};

export default function PostPage() {
  const params = useParams();
  const router = useRouter();

  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<any>(null);

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [myRequest, setMyRequest] = useState<RequestRow | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPage() {
    setLoading(true);

    const {
      data: {
        user: currentUser
      }
    } = await supabase.auth.getUser();

    setUser(currentUser);

    const {
      data: postData,
      error: postError
    } = await supabase
      .from("posts")
      .select(`
        id,
        author_id,
        kind,
        title,
        body,
        category,
        status,
        created_at,
        profiles (
          display_name
        )
      `)
      .eq("id", postId)
      .single();

    if (postError || !postData) {
      setPost(null);
      setLoading(false);
      return;
    }

    setPost(postData as Post);

    const {
      data: requestData
    } = await supabase
      .from("connection_requests")
      .select(`
        id,
        requester_id,
        owner_id,
        status,
        created_at,
        profiles (
          display_name
        )
      `)
      .eq("post_id", postId)
      .order("created_at", {
        ascending: false
      });

    const allRequests =
      (requestData as RequestRow[]) || [];

    setRequests(allRequests);

    if (currentUser) {
      const mine =
        allRequests.find(
          (r) =>
            r.requester_id === currentUser.id
        ) || null;

      setMyRequest(mine);
    }

    // Find active room for this post.
    const {
      data: roomData
    } = await supabase
      .from("rooms")
      .select(`
        id,
        post_id,
        problem_owner_id,
        solver_id,
        status
      `)
      .eq("post_id", postId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    setActiveRoom(roomData as Room | null);

    setLoading(false);
  }

  useEffect(() => {
    loadPage();

    const channel = supabase
      .channel(`post-page-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `post_id=eq.${postId}`
        },
        () => {
          loadPage();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `post_id=eq.${postId}`
        },
        () => {
          loadPage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function requestHelp() {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!post) return;

    if (user.id === post.author_id) {
      setMessage(
        "You cannot help with your own problem."
      );
      return;
    }

    if (activeRoom) {
      router.push(`/room/${activeRoom.id}`);
      return;
    }

    if (
      myRequest &&
      ["PENDING", "ACCEPTED"].includes(
        myRequest.status
      )
    ) {
      return;
    }

    setConnecting(true);
    setMessage("");

    const {
      data: request,
      error
    } = await supabase
      .from("connection_requests")
      .insert({
        post_id: post.id,
        requester_id: user.id,
        owner_id: post.author_id
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      setConnecting(false);
      return;
    }

    await supabase
      .from("notifications")
      .insert({
        user_id: post.author_id,
        type: "HELP_REQUEST",
        title: "Someone wants to help you",
        message:
          "A user wants to help solve your problem.",
        post_id: post.id,
        connection_id: request.id,
        actor_id: user.id
      });

    setMessage(
      "Your request was sent. The problem owner has been notified."
    );

    await loadPage();

    setConnecting(false);
  }

  async function createSolveRoom(
    request: RequestRow
  ) {
    if (!post || !user) return null;

    if (user.id !== post.author_id) {
      return null;
    }

    // First check if a room already exists.
    const {
      data: existingRoom
    } = await supabase
      .from("rooms")
      .select(`
        id,
        post_id,
        problem_owner_id,
        solver_id,
        status
      `)
      .eq("post_id", post.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingRoom) {
      return existingRoom as Room;
    }

    // Create room.
    const {
      data: room,
      error: roomError
    } = await supabase
      .from("rooms")
      .insert({
        post_id: post.id,
        problem_owner_id: post.author_id,
        solver_id: request.requester_id,
        title: post.title,
        category: post.category,
        status: "ACTIVE"
      })
      .select(`
        id,
        post_id,
        problem_owner_id,
        solver_id,
        status
      `)
      .single();

    if (roomError || !room) {
      // Another request may have created the room
      // at almost the same time.
      const {
        data: retryRoom
      } = await supabase
        .from("rooms")
        .select(`
          id,
          post_id,
          problem_owner_id,
          solver_id,
          status
        `)
        .eq("post_id", post.id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (retryRoom) {
        return retryRoom as Room;
      }

      setMessage(
        roomError?.message ||
          "Could not create Solve Room."
      );

      return null;
    }

    const roomRow = room as Room;

    // Add problem owner.
    const {
      error: ownerMemberError
    } = await supabase
      .from("room_members")
      .insert({
        room_id: roomRow.id,
        user_id: post.author_id,
        role: "OWNER"
      });

    if (ownerMemberError) {
      setMessage(ownerMemberError.message);
      return null;
    }

    // Add solver.
    const {
      error: solverMemberError
    } = await supabase
      .from("room_members")
      .insert({
        room_id: roomRow.id,
        user_id: request.requester_id,
        role: "SOLVER"
      });

    if (solverMemberError) {
      setMessage(solverMemberError.message);
      return null;
    }

    // Mark post as in progress.
    await supabase
      .from("posts")
      .update({
        status: "IN_PROGRESS"
      })
      .eq("id", post.id)
      .eq("author_id", post.author_id);

    // Notify solver.
    await supabase
      .from("notifications")
      .insert({
        user_id: request.requester_id,
        type: "CONNECTION_ACCEPTED",
        title: "Solve Room is ready",
        message:
          "The problem owner accepted your help. Your Solve Room is ready.",
        post_id: post.id,
        room_id: roomRow.id,
        connection_id: request.id,
        actor_id: user.id
      });

    return roomRow;
  }

  async function acceptRequest(
    request: RequestRow
  ) {
    if (!post || !user) return;

    if (user.id !== post.author_id) return;

    setConnecting(true);
    setMessage("");

    // Accept only this request.
    const {
      error: updateError
    } = await supabase
      .from("connection_requests")
      .update({
        status: "ACCEPTED",
        responded_at: new Date().toISOString()
      })
      .eq("id", request.id)
      .eq("owner_id", user.id)
      .eq("status", "PENDING");

    if (updateError) {
      setMessage(updateError.message);
      setConnecting(false);
      return;
    }

    const room = await createSolveRoom(request);

    if (!room) {
      setConnecting(false);
      await loadPage();
      return;
    }

    setActiveRoom(room);

    // Rejected/other pending requests are closed
    // because V1 allows only one solver.
    await supabase
      .from("connection_requests")
      .update({
        status: "REJECTED",
        responded_at: new Date().toISOString()
      })
      .eq("post_id", post.id)
      .eq("status", "PENDING")
      .neq("id", request.id);

    setConnecting(false);

    router.push(`/room/${room.id}`);
  }

  async function rejectRequest(
    request: RequestRow
  ) {
    if (!post || !user) return;

    if (user.id !== post.author_id) return;

    const {
      error
    } = await supabase
      .from("connection_requests")
      .update({
        status: "REJECTED",
        responded_at: new Date().toISOString()
      })
      .eq("id", request.id)
      .eq("owner_id", user.id)
      .eq("status", "PENDING");

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase
      .from("notifications")
      .insert({
        user_id: request.requester_id,
        type: "CONNECTION_REJECTED",
        title: "Help request declined",
        message:
          "The problem owner did not accept this connection.",
        post_id: post.id,
        connection_id: request.id,
        actor_id: user.id
      });

    await loadPage();
  }

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ padding: 25 }}
        >
          Loading problem...
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ padding: 30 }}
        >
          <h2>Problem not found</h2>

          <Link
            href="/home"
            className="btn"
          >
            Back to Problems
          </Link>
        </div>
      </main>
    );
  }

  const ownerName =
  post.profiles?.[0]?.display_name ||
  "ASKORAA User";

  const isOwner =
    user?.id === post.author_id;

  return (
    <main className="container">
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto"
        }}
      >

        <Link
          href="/home"
          className="small"
        >
          ← Back to Problems
        </Link>

        <article
          className="card"
          style={{
            marginTop: 15,
            padding: 28
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18
            }}
          >

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}
            >

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background:
                    post.kind === "ASK"
                      ? "#eeeeff"
                      : "#e8faf7",
                  color:
                    post.kind === "ASK"
                      ? "#4b4cc9"
                      : "#087a68",
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                {post.kind}
              </span>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f2f4f7",
                  color: "#475467",
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {post.category}
              </span>

            </div>

            <span className="small">
              {new Date(
                post.created_at
              ).toLocaleString()}
            </span>

          </div>


          <div
            style={{
              padding: 15,
              marginBottom: 20,
              borderRadius: 12,
              background: "#f8f9fc"
            }}
          >
            <div className="small">
              PROBLEM OWNER
            </div>

            <strong>
              {ownerName}
            </strong>
          </div>


          <h1
            style={{
              fontSize:
                "clamp(25px, 4vw, 36px)",
              marginBottom: 15
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
              color: "#475467"
            }}
          >
            {post.body}
          </p>


          {/* ACTIVE ROOM */}

          {activeRoom && (
            <div
              className="success"
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap"
              }}
            >
              <div>
                <strong>
                  Solve Room is active
                </strong>

                <div className="small">
                  {isOwner
                    ? "You are the Problem Owner."
                    : "You are the Solver."}
                </div>
              </div>

              <Link
                href={`/room/${activeRoom.id}`}
                className="btn"
              >
                OPEN SOLVE ROOM
              </Link>
            </div>
          )}


          {/* OWNER */}

          {isOwner && !activeRoom && (
            <section
              style={{
                marginTop: 28,
                paddingTop: 22,
                borderTop:
                  "1px solid #eaecf0"
              }}
            >

              <h3>
                People who want to help
              </h3>

              {requests.length === 0 ? (
                <p className="muted">
                  No one has offered help yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10
                  }}
                >

                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="card"
                      style={{
                        padding: 16
                      }}
                    >

                      <strong>
                        {request.profiles
                          ?.display_name ||
                          "ASKORAA User"}
                      </strong>

                      <div
                        className="small"
                        style={{
                          marginTop: 4
                        }}
                      >
                        Wants to help solve this problem.
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap"
                        }}
                      >

                        {request.status ===
                          "PENDING" && (
                          <>
                            <button
                              className="btn"
                              onClick={() =>
                                acceptRequest(
                                  request
                                )
                              }
                              disabled={connecting}
                            >
                              {connecting
                                ? "CONNECTING..."
                                : "CONNECT NOW"}
                            </button>

                            <button
                              className="btn secondary"
                              onClick={() =>
                                rejectRequest(
                                  request
                                )
                              }
                              disabled={connecting}
                            >
                              NOT NOW
                            </button>
                          </>
                        )}

                        {request.status ===
                          "ACCEPTED" && (
                          <span
                            className="success"
                          >
                            ✓ Connected
                          </span>
                        )}

                        {request.status ===
                          "REJECTED" && (
                          <span className="small">
                            Declined
                          </span>
                        )}

                      </div>
                    </div>
                  ))}

                </div>
              )}

            </section>
          )}


          {/* SOLVER */}

          {!isOwner && !activeRoom && (
            <section
              style={{
                marginTop: 28,
                paddingTop: 22,
                borderTop:
                  "1px solid #eaecf0"
              }}
            >

              {myRequest?.status ===
                "PENDING" ? (
                <div className="success">
                  ✓ Your help request was sent.
                  The problem owner has been
                  notified.
                </div>
              ) : (
                <>
                  <h3>
                    Can you help solve this?
                  </h3>

                  <p className="muted">
                    If you genuinely know how to
                    help, connect with the problem
                    owner.
                  </p>

                  <button
                    className="btn"
                    onClick={requestHelp}
                    disabled={connecting}
                  >
                    {connecting
                      ? "SENDING..."
                      : "I CAN HELP"}
                  </button>
                </>
              )}

            </section>
          )}


          {message && (
            <div
              className="alert"
              style={{
                marginTop: 18
              }}
            >
              {message}
            </div>
          )}

        </article>

      </div>
    </main>
  );
}