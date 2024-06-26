import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videPath = req.files?.videoFile[0]?.path;
  const thumbnailPath = req.files?.thumbnail[0]?.path;
  if (!videPath || !thumbnailPath) {
    throw new ApiError(400, "Provide valid image or video.");
  }
  const owner = req.user._id;
  const videoFile = await uploadOnCloudinary(videPath); // Upload the video
  const thumbnailFile = await uploadOnCloudinary(thumbnailPath); // Upload the thumbnail
  if (!videoFile || !thumbnailFile) {
    throw new ApiError(
      401,
      "Something went wrong while uploading on cloudinary."
    );
  }
  const userVideo = await Video.create({
    owner,
    title,
    description,
    duration: videoFile.duration,
    videoFile: videoFile?.secure_url,
    thumbnail: thumbnailFile?.secure_url,
  });
  const isVideoUploaded = await Video.findById(userVideo._id);
  if (!isVideoUploaded) {
    throw new ApiError(402, "Failed to save video in database");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        isVideoUploaded,
        "Video has been uploaded successfully."
      )
    );
});
const updateVideoDetails = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const video = await Video.findByIdAndUpdate(
    req.params.videoId,
    {
      $set: {
        title,
        description,
      },
    },
    { new: true } //return the updated document
  );
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details have been updated"));
});
const updateThumbnail = asyncHandler(async (req, res) => {
  console.log(req.file);
  const thumbnailPath = req.file?.path;
  if (!thumbnailPath) {
    throw new ApiError(401, "Provide valid image.");
  }
  const thumbnail = await uploadOnCloudinary(thumbnailPath);
  if (!thumbnail) {
    throw new ApiError(401, "Failed to upload on cloudinary");
  }
  const updatedThumbnail = await Video.findByIdAndUpdate(
    req.params.videoId,
    {
      $set: {
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedThumbnail, "Thumbnail uploaded successfully")
    );
});
const updateVideo = asyncHandler(async (req, res) => {
  const videoPath = await req.file?.path;
  if (!videoPath) {
    throw new ApiError(400, "Please provide a video file");
  }
  const video = await uploadOnCloudinary(videoPath);
  if (!video) {
    throw new ApiError(401, "Error in uploading on cloudinary.");
  }
  const upatedVideo = await Video.findByIdAndUpdate(req.params.videoId, {
    $set: {
      videoFile: video.url,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, upatedVideo, "Video updated successfully."));
});
const getVideoDetail = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  console.log(videoId)
  const video = await Video.aggregate([
    {
      $match: {
        _id: new  mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "User",
        localField: "_id",
        foreignField: "watchHistory",
        as: "views",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        views: 1,
        videoFile: 1,
        thumbnail: 1,
        duration: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Detail fetched successfully."));
});
const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId;
  const video = await Video.findByIdAndDelete(videoId);
  return res.status(200).json(new ApiResponse(200, "Video deleted."));
});
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, userId } = req.body;
  // console.log(userId);
  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        thumbnail: 1,
        duration: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "All videos fetched successfully."));
});
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid request-toggle status");
  }
  await Video.findByIdAndUpdate(videoId, {
    $set: {
      isPublished: !Video.findById(videoId).isPublished
    }
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Video published status toggled successfully."));
});

export {
  publishAVideo,
  updateVideoDetails,
  updateThumbnail,
  updateVideo,
  getVideoDetail,
  deleteVideo,
  getAllVideos,
  togglePublishStatus,
};
