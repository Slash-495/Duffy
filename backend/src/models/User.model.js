import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    bio: {
  type: String,
  required: [true, "Bio is required"],
  default: "New user",
  validate: {
    validator: function (v) {
      return v && v.trim().length > 0;
    },
    message: "Bio cannot be empty"
  }
},
  profilePic: {
    type: String,
    default: "",
  },

  nativeLanguage: {
    type: String,
    default: "English", 
  },

  learningLanguage: {
    type: String,
    default: "None",
  },

  location: {
    type: String,
    default: "Unknown",
  },

  isOnboarded: {
    type: Boolean, 
    default: false,
  },

  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ]
},{timestamps:true});
//createdAt, updatedAt

//prehook
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

        next();
    } catch (error) {
        next(error);
    }
})
userSchema.methods.matchPassword = async function(enteredPassword){
    const isPasswordCorrect = await bcrypt.compare(enteredPassword,this.password)
    return isPasswordCorrect;
}
const User = mongoose.model("User",userSchema);

export default User;