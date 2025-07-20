import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.js";

export async function  getRecommendedUsers(req,res){

    try {
        const currentUserId = req.user.id;
        const currentUser = req.user

        const recommendedUsers  = await User.find({
            $and:[
                {_id: {$ne: currentUserId}}, //exclude current User
                {_id: {$nin: currentUser.friends}}, //exclude friends
                {isOnboarded: true}
            ],
        })
        res.status(200).json({recommendedUsers})
    } catch (error) {
        console.log("Error in user getRecommended User Controller", error);
        res.status(500).json({message: "Internal Server Error"})
    }

}

export async function  getMyFriends(req,res){
    try {
        const user = await User.findById(req.user.id).select("friends")
        .populate("friends","fullName  profilePic nativeLanguage learningLanguage");

        res.status(200).json(user.friends)
    } catch (error) {
        console.log("Error in user getMyFriends User Controller", error);
        res.status(500).json({message: "Internal Server Error"})
    }
}

export async function sendFriendRequest(req,res){
    try {
        const myId = req.user.id;
        const {id: recipientId} = req.params

        // prevent sending request to myself
        if(myId=== recipientId){
            return res.status(400).json({message: "You can't send Friend Request to yourself"})
        }

        const recipient = await User.findById(recipientId);
        if(!recipient){
            res.status(404).json({message: "Recipient not found"})
        }

        //check if user is already friends
        if(recipient.friends.includes(myId)){
            return res.status(400).json({message: "You are already friends with this user."})
        }            
        //check if a req already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                {sender: myId, recipient: recipientId},
                {sender: recipientId, recipient: myId },
            ],
        });
        if(existingRequest){
            return res.status(400).json({message: "A friend request already exist between you and this user."})
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId,
        });

        res.status(201).json(friendRequest)
    } catch (error) {
        console.log("Error in sendFriendRequest Controller", error.message);
        res.status(500).json({message: "Internal Server Error"})
    }
}

export async function acceptFriendRequest(req,res){
    try {
        const {id:requestId} = req.params
        const friendRequest = await FriendRequest.findById(requestId);

        if(!requestId){
            res.status(404).json({message: "Friend Request Not Found"})
        }

        //verify the current user is the recipent
        if(friendRequest.recipient.toString() !== req.user.id){
            return res.status(403).json({message: "You are not authorized to accept this request"})
        }
        friendRequest.status = 'accepted';
        await friendRequest.save();

        //add each user to the other friends array
        // $addToSet: adds elements to the array that does not exist
        await User.findByIdAndUpdate(friendRequest.sender,{
            $addToSet : {friends: friendRequest.recipient},
        });

        await User.findByIdAndUpdate(friendRequest.recipient,{
            $addToSet : {friends: friendRequest.sender},
        })
    } catch (error) {
        console.log("Error in acceptFriendRequest controller", error.message);
        res.status(500).json({message: "Internal Server Error"})
    }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

    const acceptedReqsRaw = await FriendRequest.find({
      $or: [
        { recipient: req.user.id },
        { sender: req.user.id },
      ],
      status: "accepted",
    })
      .populate("sender", "fullName profilePic nativeLanguage learningLanguage")
      .populate("recipient", "fullName profilePic nativeLanguage learningLanguage");
    console.log("Accepted Requests Raw: ", JSON.stringify(acceptedReqsRaw, null, 2));
    const acceptedReqs = acceptedReqsRaw.map((req) => {
      const isSender = req.sender._id.toString() === req.user.id.toString();
      return isSender ? req.recipient : req.sender;
    });

    res.status(200).json({
      incomingReqs,
      acceptedReqs,
    });
  } catch (error) {
    console.log("Error in getFriendRequest controller", error.message);
    res.status(400).json({ message: "get Friend Requests User Controller Error" });
  }
}

export async function getoutgoingFriendReq(req,res){
    try {
        const outgoingRequests = await FriendRequest.find({
            sender: req.user.id,
            status: "pending",
        }).populate("recipient","fullName profilePic nativeLanguage learningLanguage")
        
        res.status(200).json(outgoingRequests)
    } catch (error) {
        console.log("Error in getOutgoingFriendReqs controller",error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

// make a reject request controller