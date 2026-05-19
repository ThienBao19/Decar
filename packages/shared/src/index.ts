export type {
  SubscriptionTier,
  FuelType,
  MediaType,
  ColorDTO,
  EngineDTO,
  ExteriorDTO,
  InteriorDTO,
  MediaDTO,
  VehicleListItemDTO,
  VehicleDetailDTO,
  VehicleSearchParams,
  PaginatedResult,
} from './types/vehicle.types'

export type {
  SubscriptionStatus,
  SubscriptionDTO,
  UserDTO,
} from './types/subscription.types'

export type {
  ApiError,
  ApiSuccess,
  ApiResponse,
  SignedMediaResponse,
  CheckoutSessionResponse,
  AuthTokenResponse,
} from './types/api.types'

export type {
  PartCategory,
  PartTier,
  WheelFinish,
  PaintFinish,
  WrapType,
  WindowTint,
  PartDef,
  WheelPartDef,
  PaintConfig,
  BuildConfig,
  VehicleBuildDTO,
  SlotPosition,
  SlotMap,
  CreateBuildRequest,
  UpdateBuildRequest,
} from './types/builder'

export type { VehicleCategory, VehicleCategoryMeta } from './types/vehicle-base.types'
export { VEHICLE_CATEGORIES } from './types/vehicle-base.types'
