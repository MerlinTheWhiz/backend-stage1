import { v7 as uuidv7 } from "uuid";
import { User } from "./user.model";
import { GitHubUser, UserDocument } from "./user.types";

export class UserService {
  static async createOrUpdateUser(
    githubUser: GitHubUser,
  ): Promise<UserDocument> {
    const existingUser = await User.findOne({
      github_id: githubUser.id.toString(),
    });

    if (existingUser) {
      existingUser.last_login_at = new Date();
      await existingUser.save();
      const userJson = existingUser.toJSON();
      return {
        id: userJson.id as string,
        github_id: userJson.github_id as string,
        username: userJson.username as string,
        email: userJson.email as string,
        avatar_url: userJson.avatar_url as string | undefined,
        role: userJson.role as "admin" | "analyst",
        is_active: userJson.is_active as boolean,
        last_login_at: userJson.last_login_at as string | undefined,
        created_at: userJson.created_at as string,
      };
    }

    const newUser = new User({
      id: uuidv7(),
      github_id: githubUser.id.toString(),
      username: githubUser.login,
      email: githubUser.email || `${githubUser.login}@users.noreply.github.com`,
      avatar_url: githubUser.avatar_url,
      role: "analyst",
      is_active: true,
      last_login_at: new Date(),
      created_at: new Date(),
    });

    await newUser.save();
    const userJson = newUser.toJSON();
    return {
      id: userJson.id as string,
      github_id: userJson.github_id as string,
      username: userJson.username as string,
      email: userJson.email as string,
      avatar_url: userJson.avatar_url as string | undefined,
      role: userJson.role as "admin" | "analyst",
      is_active: userJson.is_active as boolean,
      last_login_at: userJson.last_login_at as string | undefined,
      created_at: userJson.created_at as string,
    };
  }

  static async findById(userId: string): Promise<UserDocument | null> {
    const user = await User.findOne({ id: userId, is_active: true });
    if (!user) return null;
    const userJson = user.toJSON();
    return {
      id: userJson.id as string,
      github_id: userJson.github_id as string,
      username: userJson.username as string,
      email: userJson.email as string,
      avatar_url: userJson.avatar_url as string | undefined,
      role: userJson.role as "admin" | "analyst",
      is_active: userJson.is_active as boolean,
      last_login_at: userJson.last_login_at as string | undefined,
      created_at: userJson.created_at as string,
    };
  }

  static async findByGithubId(githubId: string): Promise<UserDocument | null> {
    const user = await User.findOne({ github_id: githubId, is_active: true });
    if (!user) return null;
    const userJson = user.toJSON();
    return {
      id: userJson.id as string,
      github_id: userJson.github_id as string,
      username: userJson.username as string,
      email: userJson.email as string,
      avatar_url: userJson.avatar_url as string | undefined,
      role: userJson.role as "admin" | "analyst",
      is_active: userJson.is_active as boolean,
      last_login_at: userJson.last_login_at as string | undefined,
      created_at: userJson.created_at as string,
    };
  }

  static async updateUserRole(
    userId: string,
    role: "admin" | "analyst",
  ): Promise<UserDocument | null> {
    const user = await User.findOneAndUpdate(
      { id: userId, is_active: true },
      { role },
      { new: true },
    );
    if (!user) return null;
    const userJson = user.toJSON();
    return {
      id: userJson.id as string,
      github_id: userJson.github_id as string,
      username: userJson.username as string,
      email: userJson.email as string,
      avatar_url: userJson.avatar_url as string | undefined,
      role: userJson.role as "admin" | "analyst",
      is_active: userJson.is_active as boolean,
      last_login_at: userJson.last_login_at as string | undefined,
      created_at: userJson.created_at as string,
    };
  }

  static async deactivateUser(userId: string): Promise<boolean> {
    const result = await User.updateOne({ id: userId }, { is_active: false });
    return result.modifiedCount > 0;
  }
}
