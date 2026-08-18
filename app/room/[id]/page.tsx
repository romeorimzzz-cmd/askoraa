"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Room = {
  id: string;
  post_id: string;
  problem_owner_id: string;
  solver_id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
};

type Member = {
  user_id: string;
  role: "OWNER" | "SOLVER";
  profiles?: {
    display_name: string;
  } | null;
};

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function SolveRoomPage() {
  const params = useParams();

  const roomId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function loadRoom() {
    setLoading(true);
    setError("");

    const {
      data: {
        user: currentUser
      }
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setError("Please login to open this Solve Room.");
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const {
      data: roomData,
      error: roomError
    } = await supabase
      .from("rooms")
      .select(`
        id,
        post_id,
        problem_owner_id,
        solver_id,
        title,
        category,
        status,
        created_at
      `)
      .eq("id", roomId)
      .single();

    if (roomError || !roomData) {
      setError("Solve Room not found or access denied.");
      setLoading(false);
      return;
    }

    const roomRow = roomData as Room;

    if (
      currentUser.id !== roomRow.problem_owner_id &&
      currentUser.id !== roomRow.solver_id
    ) {
      setError(
        "You are not a member of this Solve Room."
      );
      setLoading(false);
      return;
    }

    setRoom(roomRow);

    const {
      data: memberData
    } = await supabase
      .from("room_members")
      .select(`
        user_id,
        role,
        profiles (
          display_name
        )
      `)
      .eq("room_id", roomId);

    setMembers(
      (memberData as Member[]) || []
    );

    const {
      data: messageData,
      error: messageError
    } = await supabase
      .from("messages")
      .select(`
        id,
        room_id,
        sender_id,
        body,
        created_at
      `)
      .eq("room_id", roomId)
      .order("created_at", {
        ascending: true
      });

    if (messageError) {
      setError(messageError.message);
    } else {
      setMessages(
        (messageData as Message[]) || []
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`solve-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage =
            payload.new as Message;

          setMessages((current) => {
            const alreadyExists =
              current.some(
                (message) =>
                  message.id === newMessage.id
              );

            if (alreadyExists) {
              return current;
            }

            return [...current, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  async function sendMessage() {
    const text = messageText.trim();

    if (!text || !user || !room) {
      return;
    }

    if (sending) {
      return;
    }

    setSending(true);
    setError("");

    const {
      error: sendError
    } = await supabase
      .from("messages")
      .insert({
        room_id: room.id,
        sender_id: user.id,
        body: text
      });

    if (sendError) {
      setError(sendError.message);
    } else {
      setMessageText("");
    }

    setSending(false);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  function getMemberName(
    userId: string
  ) {
    const member = members.find(
      (item) =>
        item.user_id === userId
    );

    return (
      member?.profiles?.display_name ||
      "ASKORAA User"
    );
  }

  function formatTime(
    value: string
  ) {
    return new Date(value).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ padding: 25 }}
        >
          Opening Solve Room...
        </div>
      </main>
    );
  }

  if (error || !room || !user) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            maxWidth: 650,
            margin: "40px auto",
            padding: 30
          }}
        >
          <h2>
            Solve Room unavailable
          </h2>

          <p className="muted">
            {error ||
              "Something went wrong."}
          </p>

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

  const isOwner =
    user.id === room.problem_owner_id;

  const otherUserId = isOwner
    ? room.solver_id
    : room.problem_owner_id;

  const otherUserName =
    getMemberName(otherUserId);

  return (
    <main
      className="container"
      style={{
        paddingTop: 24,
        paddingBottom: 30
      }}
    >
      <div
        style={{
          maxWidth: 850,
          margin: "0 auto"
        }}
      >

        {/* TOP */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 15
          }}
        >
          <Link
            href="/my"
            className="small"
          >
            ← Back to My
          </Link>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background:
                room.status === "ACTIVE"
                  ? "#e8faf7"
                  : "#f2f4f7",
              color:
                room.status === "ACTIVE"
                  ? "#087a68"
                  : "#667085",
              fontSize: 11,
              fontWeight: 800
            }}
          >
            {room.status}
          </span>
        </div>


        {/* ROOM HEADER */}

        <section
          className="card"
          style={{
            overflow: "hidden"
          }}
        >

          <div
            style={{
              padding: "22px 24px",
              background:
                "linear-gradient(135deg, #f1f1ff, #effbf8)",
              borderBottom:
                "1px solid #e5e9f2"
            }}
          >

            <div
              className="small"
              style={{
                marginBottom: 6
              }}
            >
              SOLVE ROOM
            </div>

            <h1
              style={{
                marginBottom: 8,
                fontSize:
                  "clamp(21px, 4vw, 30px)"
              }}
            >
              {room.title}
            </h1>

            <span
              style={{
                display: "inline-block",
                padding: "5px 9px",
                borderRadius: 999,
                background: "#ffffff",
                border:
                  "1px solid #e1e5ed",
                color: "#475467",
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {room.category}
            </span>
          </div>


          {/* PEOPLE */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))"
            }}
          >

            <div
              style={{
                padding: 18,
                borderRight:
                  "1px solid #eef0f4"
              }}
            >
              <div
                className="small"
                style={{
                  marginBottom: 5
                }}
              >
                PROBLEM OWNER
              </div>

              <strong>
                {getMemberName(
                  room.problem_owner_id
                )}
              </strong>

              {isOwner && (
                <div
                  style={{
                    marginTop: 5,
                    color: "#5b5ce2",
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  YOU
                </div>
              )}
            </div>


            <div
              style={{
                padding: 18
              }}
            >
              <div
                className="small"
                style={{
                  marginBottom: 5
                }}
              >
                SOLVER
              </div>

              <strong>
                {getMemberName(
                  room.solver_id
                )}
              </strong>

              {!isOwner && (
                <div
                  style={{
                    marginTop: 5,
                    color: "#16a394",
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  YOU
                </div>
              )}
            </div>

          </div>

        </section>


        {/* CHAT */}

        <section
          className="card"
          style={{
            marginTop: 16,
            overflow: "hidden"
          }}
        >

          {/* CHAT HEADER */}

          <div
            style={{
              padding: "15px 18px",
              borderBottom:
                "1px solid #eaecf0",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >

            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, #5b5ce2, #16a394)",
                color: "white",
                fontWeight: 900
              }}
            >
              {otherUserName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {otherUserName}
              </strong>

              <div
                className="small"
                style={{
                  marginTop: 2
                }}
              >
                {isOwner
                  ? "Your solver"
                  : "Problem owner"}
              </div>
            </div>

          </div>


          {/* MESSAGE AREA */}

          <div
            style={{
              height: "min(52vh, 520px)",
              minHeight: 360,
              overflowY: "auto",
              padding: "20px 16px",
              background:
                "linear-gradient(180deg, #f8f9fc, #ffffff)"
            }}
          >

            {messages.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 30
                }}
              >
                <div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 12px",
                      background:
                        "#eeeeff",
                      color:
                        "#5b5ce2",
                      fontSize: 23,
                      fontWeight: 900
                    }}
                  >
                    💬
                  </div>

                  <strong>
                    Start the conversation
                  </strong>

                  <p
                    className="muted"
                    style={{
                      maxWidth: 360,
                      margin:
                        "7px auto 0",
                      lineHeight: 1.5
                    }}
                  >
                    Explain the problem,
                    ask questions, and
                    work together on a
                    solution.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => {

                const mine =
                  message.sender_id ===
                  user.id;

                return (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        mine
                          ? "flex-end"
                          : "flex-start",
                      marginBottom: 10
                    }}
                  >

                    <div
                      style={{
                        maxWidth:
                          "min(75%, 580px)",
                        padding:
                          "10px 13px",
                        borderRadius:
                          mine
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        background:
                          mine
                            ? "linear-gradient(135deg, #5b5ce2, #7071eb)"
                            : "#ffffff",
                        color:
                          mine
                            ? "#ffffff"
                            : "#344054",
                        border:
                          mine
                            ? "none"
                            : "1px solid #e5e9f2",
                        boxShadow:
                          "0 3px 10px rgba(30,40,70,0.06)"
                      }}
                    >

                      {!mine && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#5b5ce2",
                            marginBottom: 3
                          }}
                        >
                          {getMemberName(
                            message.sender_id
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          whiteSpace:
                            "pre-wrap",
                          lineHeight: 1.5,
                          wordBreak:
                            "break-word"
                        }}
                      >
                        {message.body}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 9,
                          opacity: 0.65,
                          textAlign: "right"
                        }}
                      >
                        {formatTime(
                          message.created_at
                        )}
                      </div>

                    </div>

                  </div>
                );
              })
            )}

            <div
              ref={messagesEndRef}
            />

          </div>


          {/* INPUT */}

          <div
            style={{
              padding: 12,
              borderTop:
                "1px solid #eaecf0",
              background: "#ffffff"
            }}
          >

            {error && (
              <div
                className="alert"
                style={{
                  marginTop: 0
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 9
              }}
            >

              <textarea
                value={messageText}
                onChange={(event) =>
                  setMessageText(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  "Write a message..."
                }
                rows={2}
                style={{
                  minHeight: 48,
                  maxHeight: 120,
                  resize: "none",
                  margin: 0
                }}
              />

              <button
                className="btn"
                onClick={sendMessage}
                disabled={
                  sending ||
                  !messageText.trim()
                }
                style={{
                  minWidth: 78
                }}
              >
                {sending
                  ? "..."
                  : "Send"}
              </button>

            </div>

            <div
              className="small"
              style={{
                marginTop: 6
              }}
            >
              Enter to send • Shift + Enter
              for a new line
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}