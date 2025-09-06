/**
 * Countries Check Code API Route
 */

import { NextRequest } from 'next/server';
import { getCountriesController } from '../factory';

const controller = getCountriesController();

export async function GET(request: NextRequest) {
  return controller.handleCheckCode(request);
}