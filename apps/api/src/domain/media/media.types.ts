import {type Static, Type} from '@sinclair/typebox';
import {mediaStateEnum, mediaTypeEnum} from '~/drizzle/schema';
import {createEnum} from '~/infra/utils/fns';
import {
  BaseModelSchema,
  createItemResponseSchema,
  createListResponseSchema,
} from '~/infra/utils/schema';

export const Media = Type.Object({
  ...BaseModelSchema,
  userId: Type.String(),
  name: Type.String(),
  type: Type.Enum(createEnum(mediaTypeEnum.enumValues)),
  state: Type.Enum(createEnum(mediaStateEnum.enumValues)),
});

export const GetMediaDetailParams = Type.Object({
  mediaId: Type.String(),
});

export type GetMediaDetailParams = Static<typeof GetMediaDetailParams>;

export const GetMediaDetailResponse = createItemResponseSchema('media', Media);

export type GetMediaDetailResponse = Static<typeof GetMediaDetailResponse>;

export const SearchMediaQueryString = Type.Partial(
  Type.Object({
    page: Type.Number(),
    size: Type.Number(),
    mediaId: Type.String(),
    name: Type.String(),
  })
);

export type SearchMediaQueryString = Static<typeof SearchMediaQueryString>;

export const SearchMediaResponse = createListResponseSchema('medias', Media);

export type SearchMediaResponse = Static<typeof SearchMediaResponse>;

export const CreateMediaBody = Type.Object({
  name: Type.String(),
  type: Type.Enum(createEnum(mediaTypeEnum.enumValues)),
  url: Type.String(),
});

export type CreateMediaBody = Static<typeof CreateMediaBody>;

export const CreateMediaResponse = createItemResponseSchema('media', Media);

export type CreateMediaResponse = Static<typeof CreateMediaResponse>;

export const UpdateMediaParams = Type.Object({
  mediaId: Type.String(),
});

export type UpdateMediaParams = Static<typeof UpdateMediaParams>;

export const UpdateMediaBody = Type.Object({
  name: Type.String(),
});

export type UpdateMediaBody = Static<typeof UpdateMediaBody>;

export const UpdateMediaResponse = createItemResponseSchema('media', Media);

export type UpdateMediaResponse = Static<typeof UpdateMediaResponse>;

export const RemoveMediaParams = Type.Object({
  mediaId: Type.String(),
});

export type RemoveMediaParams = Static<typeof RemoveMediaParams>;

export const RemoveMediaResponse = createItemResponseSchema('media', Media);

export type RemoveMediaResponse = Static<typeof RemoveMediaResponse>;
