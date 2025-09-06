/**
 * Abstract Base Repository Implementation
 * Provides common functionality for all Prisma-based repositories
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/database/prisma';
import { PaginationParams, PaginatedResult, CRUDFilters } from './types';
import { BaseRepository } from './repository.interface';

export abstract class BasePrismaRepository<
  TEntity, 
  TCreateData, 
  TUpdateData, 
  TFilters extends CRUDFilters = CRUDFilters,
  TPrismaModel = any
> implements BaseRepository<TEntity, TCreateData, TUpdateData, TFilters> {
  
  protected readonly prisma = prisma;
  
  /**
   * Subclasses must provide the Prisma model delegate
   */
  protected abstract get model(): TPrismaModel;
  
  /**
   * Subclasses must provide the select clause for queries
   */
  protected abstract get selectClause(): any;
  
  /**
   * Transform Prisma data to domain entity
   */
  protected abstract mapToEntity(data: any): TEntity;
  
  /**
   * Transform create data for Prisma
   */
  protected abstract mapCreateData(data: TCreateData): any;
  
  /**
   * Transform update data for Prisma
   */
  protected abstract mapUpdateData(data: TUpdateData): any;
  
  /**
   * Build where clause from filters
   */
  protected abstract buildWhereClause(filters?: TFilters): any;

  /**
   * Generate a new UUID for entities
   */
  protected generateId(): string {
    return randomUUID();
  }

  /**
   * Calculate pagination parameters
   */
  protected calculatePagination(pagination?: PaginationParams) {
    const page = pagination?.page || 1;
    const pageSize = Math.min(pagination?.pageSize || 10, 100); // Max 100 items per page
    const skip = (page - 1) * pageSize;
    
    return { page, pageSize, skip, take: pageSize };
  }

  /**
   * Create paginated result
   */
  protected createPaginatedResult<T>(
    data: T[], 
    totalCount: number, 
    pagination: { page: number; pageSize: number }
  ): PaginatedResult<T> {
    return {
      data,
      totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize)
    };
  }

  async findAll(filters?: TFilters, pagination?: PaginationParams): Promise<PaginatedResult<TEntity>> {
    const { page, pageSize, skip, take } = this.calculatePagination(pagination);
    const whereClause = this.buildWhereClause(filters);

    const [data, totalCount] = await Promise.all([
      (this.model as any).findMany({
        where: whereClause,
        select: this.selectClause,
        skip,
        take,
        orderBy: this.getDefaultOrderBy()
      }),
      (this.model as any).count({ where: whereClause })
    ]);

    const entities = data.map((item: any) => this.mapToEntity(item));
    return this.createPaginatedResult(entities, totalCount, { page, pageSize });
  }

  async findById(id: string): Promise<TEntity | null> {
    const data = await (this.model as any).findUnique({
      where: { id },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async create(data: TCreateData): Promise<TEntity> {
    const createData = {
      id: this.generateId(),
      updated_at: new Date(),
      ...this.mapCreateData(data)
    };

    const result = await (this.model as any).create({
      data: createData,
      select: this.selectClause
    });

    return this.mapToEntity(result);
  }

  async update(id: string, data: TUpdateData): Promise<TEntity> {
    const updateData = {
      updated_at: new Date(),
      ...this.mapUpdateData(data)
    };

    const result = await (this.model as any).update({
      where: { id },
      data: updateData,
      select: this.selectClause
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    await (this.model as any).delete({
      where: { id }
    });
  }

  async exists(id: string): Promise<boolean> {
    const result = await (this.model as any).findUnique({
      where: { id },
      select: { id: true }
    });

    return !!result;
  }

  async count(filters?: TFilters): Promise<number> {
    const whereClause = this.buildWhereClause(filters);
    return (this.model as any).count({ where: whereClause });
  }

  /**
   * Default ordering - can be overridden by subclasses
   */
  protected getDefaultOrderBy(): any {
    return { updated_at: 'desc' };
  }
}