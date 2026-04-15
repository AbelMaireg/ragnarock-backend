import { Controller, Get, Post, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { SearchUsersQueryDto } from "./dto/search-users.query.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("search")
  search(@Query() query: SearchUsersQueryDto) {
    return this.usersService.search(query);
  }

  @Post("reindex")
  reindex() {
    return this.usersService.reindex();
  }
}
