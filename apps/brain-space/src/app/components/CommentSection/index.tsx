"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MessageCircle } from "lucide-react";

interface CommentFormData {
  content: string;
}

export default function CommentSection({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<string[]>([]);
  const { register, handleSubmit, reset } = useForm<CommentFormData>();

  const onSubmit = async (data: CommentFormData) => {
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          content: data.content,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments([...comments, newComment]);
        reset();
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Bình luận</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
        <textarea
          {...register("content", { required: true })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
          rows={3}
          placeholder="Viết bình luận của bạn..."
        />
        <button
          type="submit"
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Đăng bình luận
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((comment: any) => (
          <div key={comment.id} className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold">{comment.author}</div>
              <div className="text-sm text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </div>
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
