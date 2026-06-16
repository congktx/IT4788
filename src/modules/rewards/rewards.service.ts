import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { RewardProof } from "./entities/reward_proof.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { RewardAppeal } from "./entities/reward_appeal.entity";
import { GetRewardHistoryDto } from "./dto/get-reward-history.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { CreateRewardAppealDto } from "./dto/create-reward-appeal.dto";
import OpenAI from "openai";
import { SecretConfig } from "../../config/secret";
import { AddRewardProofDto } from "./dto/add-reward-proof.dto";
import { Wallet } from "../wallets/entities/wallet.entity";
import { GetRewardProofDto } from "./dto/get-reward-proof.dto";
import { GoogleGenAI } from "@google/genai";

import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({});
@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardProof)
    private readonly rewardProofRepo: Repository<RewardProof>,

    @InjectRepository(RewardAppeal)
    private readonly rewardAppealRepo: Repository<RewardAppeal>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>
  ) { }

  async getRewardHistory(currentUserId: number, getRewardHistoryDto: GetRewardHistoryDto) {
    const skip = (getRewardHistoryDto.index - 1) * getRewardHistoryDto.count;
    let [proofs, _] = await this.rewardProofRepo.findAndCount({
      where: {
        user: { id: currentUserId }
      },
      relations: ["user", "appeals"],
      order: {
        created_at: "DESC"
      },
      skip: skip,
      take: getRewardHistoryDto.count
    });
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: proofs
    }
  }

  async createRewardAppeal(currentUserId: number, body: CreateRewardAppealDto) {
    let reward = await this.rewardProofRepo.findOne({ where: { id: body.reward_id } });
    if (!reward) {
      return {
        ...APP_RESPONSE.PARAMETER_VALUE_INVALID,
        data: null
      }
    }
    let appeal = await this.rewardAppealRepo.create({
      reason: body.reason,
      status: "pending",
      proof: { id: reward.id },
      user: { id: currentUserId },
    });
    return {
      ...APP_RESPONSE.OK,
      data: await this.rewardAppealRepo.save(appeal)
    }
  }

  async callApiOpenAi(input_text: string, input_url: string) {
    try {
      const client = new OpenAI({
        apiKey: SecretConfig.openai.api_key
      })

      // const models = await client.models.list();

      // for (const model of models.data) {
      //   console.log(model.id);
      // }

      const response = await client.responses.create({
        model: "gpt-5.5",
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: input_text
            },
            {
              type: "input_image",
              image_url: input_url,
              detail: "auto"
            }
          ]
        }]
      });

      return response.output_text;
    } catch (err: any) {
      console.log(`Error with prompt ${input_text} ${input_url}: ${err}`);
      return `Error with prompt ${input_text} ${input_url}: ${err.toString()}`;
    }
  }

  async fetchImageAndConvertToBase64(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Không thể tải ảnh. Status: ${response.status}`);
      }

      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      return { mimeType, base64Data };
    } catch (error) {
      console.error("Lỗi khi tải ảnh:", error);
      throw error;
    }
  }

  async analyzeImageFromUrl(prompt: string, imageUrl: string) {
    try {
      console.log("1. Đang tải ảnh từ URL về bộ nhớ...");
      const { mimeType, base64Data } = await this.fetchImageAndConvertToBase64(imageUrl);

      console.log("2. Đang gửi ảnh và câu hỏi cho Gemini...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      });

      console.log('\n--- Đánh giá của Gemini ---');
      console.log(response.text);
      console.log('---------------------------\n');

      return response.text;
    } catch (err: any) {
      console.log(`Error with prompt ${prompt} ${imageUrl}: ${err}`);
      return `Error with prompt ${prompt} ${imageUrl}: ${err.toString()}`;
    }
  }

  async addRewardProof(currentUserId: number, body: AddRewardProofDto) {
    if ((!body.image_url && !body.video_url) || (body.image_url && body.video_url)) {
      return {
        ...APP_RESPONSE.PARAMETER_VALUE_INVALID,
        data: null
      }
    }

    let type_proof = ""; let url = "";
    if (body.image_url) { type_proof = "image"; url = body.image_url; }
    if (body.video_url) { type_proof = "video"; url = body.video_url; }

    let proof = this.rewardProofRepo.create({
      image_url: body.image_url,
      video_url: body.video_url,
      description: body.description,
      ai_score: -1,
      reward_coin: -1,
      user: { id: currentUserId }
    });

    let proof_saved = await this.rewardProofRepo.save(proof);

    let input_text =
      `trong ${type_proof} trên có phải có ${body.description} không? hãy xác định rõ cả số lượng trong câu hỏi, nếu đúng trả lời 1, nếu sai trả lời 0, 
      không trả lời thêm bất cứ từ nào ngoài 0 hoặc 1, cứ đưa ra câu trả lời theo cảm tính của bạn`;
    let result_prompt = await this.analyzeImageFromUrl(input_text, url);
    let ai_score = -1; let reward_coin = -1;
    if (result_prompt == "0") {
      ai_score = 0;
      reward_coin = 0;
    } else if (result_prompt == "1") {
      ai_score = 1;
      reward_coin = 1000000;
    } else {
      return {
        ...APP_RESPONSE.OK,
        data: {
          proof: proof_saved,
          error: result_prompt
        }
      }
    }

    if (ai_score > 0) {
      let wallet = await this.walletRepo.findOne({
        where: { user: { id: currentUserId } }
      });
      if (wallet) {
        let balance_after = Number(wallet.balance) + reward_coin;
        await this.walletRepo.update(wallet.id, {
          balance: balance_after
        })
      } else {
        wallet = this.walletRepo.create({
          user_id: currentUserId,
          user: { id: currentUserId },
          balance: reward_coin,
          pending_balance: 0
        });
        await this.walletRepo.save(wallet);
      }
    }

    await this.rewardProofRepo.update(proof_saved.id, {
      ai_score: ai_score,
      reward_coin: reward_coin
    })

    return {
      ...APP_RESPONSE.OK,
      data: {
        proof: {
          ...proof_saved,
          ai_score: ai_score,
          reward_coin: reward_coin
        }
      }
    }
  }

  async getRewardProof(currentUserId: number, body: GetRewardProofDto) {
    let proof = await this.rewardProofRepo.findOne({
      where: { id: body.reward_id },
      relations: ['user', 'appeals']
    });
    if (!proof || proof.user.id != currentUserId) {
      return {
        ...APP_RESPONSE.PARAMETER_VALUE_INVALID,
        data: null
      }
    }
    return {
      ...APP_RESPONSE.OK,
      data: proof
    }
  }
}

