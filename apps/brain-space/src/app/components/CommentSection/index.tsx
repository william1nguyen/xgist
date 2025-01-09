"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUser } from "@auth0/nextjs-auth0/client";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    avatar: string;
  };
}

interface CommentFormData {
  content: string;
}

type CommentSectionProps = {
  videoId: string;
  isAuthenticated: boolean;
};

export default function CommentSection({
  videoId,
  isAuthenticated,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CommentFormData>();

  // Load comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/comments`);
        if (!response.ok) throw new Error("Failed to fetch comments");
        const data = await response.json();
        setComments(data.comments);
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [videoId]);

  // Submit new comment
  const onSubmit = async (data: CommentFormData) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: data.content,
        }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const newComment = await response.json();
      setComments((prev) => [newComment, ...prev]);
      reset(); // Reset form
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading comments...</div>;
  }

  return (
    <div className="mt-6 bg-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Bình luận</h2>

      {user ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
          <textarea
            {...register("content", { required: true })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Viết bình luận của bạn..."
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSubmitting ? "Đang đăng..." : "Đăng bình luận"}
          </button>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <a href="/api/auth/login" className="text-blue-600 hover:underline">
            Đăng nhập để bình luận
          </a>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center">Chưa có bình luận nào.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                {comment.user.avatar && (
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="font-semibold">{comment.user.name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
