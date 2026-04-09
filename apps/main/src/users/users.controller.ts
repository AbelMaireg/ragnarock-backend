import { Controller, Get, Post, Query } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("search")
  search(@Query("q") q = "*", @Query("page") page = "1", @Query("per_page") perPage = "20") {
    return this.usersService.search(q, Number(page), Number(perPage));
  }

  @Post("reindex")
  reindex() {
    return this.usersService.reindex();
  }
}
