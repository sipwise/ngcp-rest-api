import { ApiHideProperty, ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateAdminDto } from "./create-admin.dto";

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}