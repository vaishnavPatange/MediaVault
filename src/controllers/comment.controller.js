import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNo = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNo - 1) * pageLimit;

    if (!isValidObjectId(videoId)) throw new ApiErrors(400, "Invalid videoId");

    const doesVideoExists = await Video.findById(videoId);

    if (!doesVideoExists) throw new ApiErrors(404, "Video not found");

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                isOwner: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$owner._id"],
                        },
                        then: true,
                        else: false,
                    },
                },
                owner: {
                    $first: "$owner",
                },
            },
        },
    ])
        .limit(pageLimit)
        .skip(skip);

    if (!comments)
        throw new ApiErrors(
            500,
            "Something went wrong while fetching video comments"
        );

    const commentCount = await Comment.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                comments,
                commentCount,
            },
            "Comments fetched successfully"
        )
    );
});

const addComment = asyncHandler(async (req, res) => {
    
    const { videoId } = req.params;
    const { content } = req.body;
    const owner = req.user?._id;

    if (!isValidObjectId(videoId)) throw new ApiErrors(400, "Invalid videoId");

    const comment = await Comment.create({
        video: videoId,
        owner,
        content,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    
    const { commentId } = req.params;
    const { content } = req.body;
    if (!isValidObjectId(commentId))
        throw new ApiErrors(400, "Invalid CommentId");

    const existingComment = await Comment.findOne({
        _id: commentId,
        owner: req.user?._id,
    });

    if (!existingComment)
        throw new ApiErrors(
            404,
            "Comment not found Or You are not owner of this comment"
        );

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content },
        },
        { new: true }
    );

    if(!updateComment) throw new ApiErrors(500, "Something went wrong while updating comment");

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )

});

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    if (!isValidObjectId(commentId))
        throw new ApiErrors(400, "Invalid CommentId");
    
    const existingComment = await Comment.findOne({
        _id: commentId,
        owner: req.user?._id,
    });

    if (!existingComment)
        throw new ApiErrors(
            404,
            "Comment not found Or You are not owner of this comment"
        );

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    return res.status(200)
    .json( new ApiResponse(
        200,
        {delete: true},
        "Comment deleted successfully"
    ));

});

export { getVideoComments, addComment, updateComment, deleteComment };
